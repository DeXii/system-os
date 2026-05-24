import { db } from '../db';
import { callGroq } from '../ai/groq-client';
import {
  getDirectorConfig,
  validateDirectorConfig,
} from '../ai/director-service';
import { lookupDictionary, normalizeGlossaryTerm } from './dictionary.ru';
import { GLOSSARY_SYSTEM_PROMPT, buildGlossaryUserPrompt } from './glossary-prompt';
export type { GlossaryCacheEntry } from './types';

const UNAVAILABLE_MSG =
  'Объяснение недоступно. Настройте Groq в разделе Archive → Groq Settings.';

const inflight = new Map<string, Promise<string>>();

function cacheId(term: string): string {
  return `${normalizeGlossaryTerm(term)}:ru`;
}

export async function getCachedExplanation(term: string): Promise<string | undefined> {
  const row = await db.glossaryCache.get(cacheId(term));
  return row?.text;
}

async function saveCache(term: string, text: string, source: 'dict' | 'ai'): Promise<void> {
  const id = cacheId(term);
  await db.glossaryCache.put({
    id,
    term: normalizeGlossaryTerm(term),
    text,
    source,
    updatedAt: new Date().toISOString(),
  });
}

async function fetchFromAi(term: string, context?: string): Promise<string> {
  const cfg = getDirectorConfig();
  const valid = validateDirectorConfig(cfg);
  if (!valid.ok) return UNAVAILABLE_MSG;

  const result = await callGroq(
    GLOSSARY_SYSTEM_PROMPT,
    buildGlossaryUserPrompt(term, context),
    cfg,
    { temperature: 0.3, maxTokens: 80 }
  );

  if (!result.ok) return UNAVAILABLE_MSG;

  const text = result.text.trim().slice(0, 200);
  if (text) await saveCache(term, text, 'ai');
  return text || UNAVAILABLE_MSG;
}

/**
 * Словарь → IndexedDB → Groq (с дедупликацией in-flight).
 */
export async function resolveGlossaryExplanation(
  term: string,
  context?: string
): Promise<{ text: string; source: 'dict' | 'cache' | 'ai' | 'unavailable' }> {
  const dict = lookupDictionary(term);
  if (dict) return { text: dict, source: 'dict' };

  const cached = await getCachedExplanation(term);
  if (cached) return { text: cached, source: 'cache' };

  const key = cacheId(term);
  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchFromAi(term, context);
    inflight.set(key, pending);
    pending.finally(() => inflight.delete(key));
  }

  const text = await pending;
  const source = text === UNAVAILABLE_MSG ? 'unavailable' : 'ai';
  return { text, source };
}
