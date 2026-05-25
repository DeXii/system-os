import { db, uid } from '../db';
import type { AiAction, AiInsight, DirectorConfig, ModuleId } from '../domain/types';
import { emitKernel } from '../events/event-bus';
import { markBriefingDone, markDebriefDone } from '../engines/command-compliance';
import { applyDirectorActions as applyKernelActions } from '../engines/os-kernel';
import { buildDirectorContext } from './context-builder';
import { parseAiActions, stripActionsBlock } from './action-parser';
import { DIRECTOR_MASTER_PROMPT, TASK_ADDENDUMS } from './prompts/director-master';
import { resolveScope, type TaskId } from './director-tasks';
import { todayKey } from '../db';
import { callGroq } from './groq-client';

export type { TaskId } from './director-tasks';

const LS_KEY = 'ayanakoji_groq_key';
const LS_PROXY = 'ayanakoji_groq_proxy';
const LS_TOKEN = 'ayanakoji_proxy_token';
const LS_MODEL = 'ayanakoji_groq_model';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const DEFAULT_PROXY = (import.meta.env.VITE_GROQ_PROXY_URL || '').trim().replace(/\/$/, '');
const DEFAULT_PROXY_TOKEN = (import.meta.env.VITE_PROXY_TOKEN || '').trim();

/** Production build uses API key on the worker, not in the browser. */
export function usesServerGroqKey(): boolean {
  return import.meta.env.PROD || !!DEFAULT_PROXY;
}

export function getDirectorConfig(): DirectorConfig {
  const serverKey = usesServerGroqKey();
  return {
    apiKey: serverKey ? '' : (localStorage.getItem(LS_KEY) || '').trim(),
    proxyUrl: (localStorage.getItem(LS_PROXY) || DEFAULT_PROXY).trim().replace(/\/$/, ''),
    proxyToken: (localStorage.getItem(LS_TOKEN) || DEFAULT_PROXY_TOKEN).trim() || undefined,
    model: (localStorage.getItem(LS_MODEL) || DEFAULT_MODEL).trim(),
  };
}

export function setDirectorConfig(cfg: Partial<DirectorConfig>): void {
  if (cfg.apiKey != null) localStorage.setItem(LS_KEY, cfg.apiKey);
  if (cfg.proxyUrl != null) localStorage.setItem(LS_PROXY, cfg.proxyUrl.replace(/\/$/, ''));
  if (cfg.proxyToken != null) localStorage.setItem(LS_TOKEN, cfg.proxyToken);
  if (cfg.model != null) localStorage.setItem(LS_MODEL, cfg.model);
}

export function validateDirectorConfig(cfg: DirectorConfig): { ok: boolean; error?: string } {
  if (!cfg.proxyUrl) {
    return { ok: false, error: 'Укажите Proxy URL (workers/groq-proxy)' };
  }
  if (!usesServerGroqKey() && !cfg.apiKey) {
    return { ok: false, error: 'Укажите Groq API Key (локальный режим)' };
  }
  return { ok: true };
}

export function getDirectorStatus(): 'online' | 'offline' | 'needs_config' {
  const cfg = getDirectorConfig();
  const v = validateDirectorConfig(cfg);
  return v.ok ? 'online' : cfg.proxyUrl || cfg.apiKey ? 'needs_config' : 'offline';
}

export async function runDirectorTask(
  taskId: TaskId,
  options?: {
    userMessage?: string;
    scope?: ModuleId | 'full';
    onProgress?: (message: string) => void;
  }
): Promise<{ ok: true; insight: AiInsight } | { ok: false; error: string }> {
  const cfg = getDirectorConfig();
  const valid = validateDirectorConfig(cfg);
  if (!valid.ok) return { ok: false, error: valid.error ?? 'Invalid config' };

  const scope = resolveScope(taskId, options?.scope);

  try {
    options?.onProgress?.('Сбор контекста...');
    const context = await buildDirectorContext(scope);
    const addendum = TASK_ADDENDUMS[taskId] ?? '';
    const system = `${DIRECTOR_MASTER_PROMPT}\n\n---\n${addendum}`;
    const user =
      options?.userMessage ??
      `Контекст оператора:\n${context}\n\nВыполни задачу: ${taskId}`;

    options?.onProgress?.('Запрос к Groq...');
    const result = await callGroq(system, user, cfg);
    if (!result.ok) {
      await emitKernel('director', `DIRECTOR: ${taskId} — ${result.error}`, 'error');
      return result;
    }

    const actions = parseAiActions(result.text);
    const cleanText = stripActionsBlock(result.text);

    const insightScope =
      scope === 'full' ? ('full' as const) : (scope as AiInsight['scope']);

    const insight: AiInsight = {
      id: uid(),
      taskId,
      scope: insightScope,
      text: cleanText,
      actions,
      createdAt: new Date().toISOString(),
    };

    await db.aiInsights.add(insight);
    await db.aiMessages.add({
      id: uid(),
      role: 'assistant',
      content: cleanText,
      taskId,
      createdAt: insight.createdAt,
    });

    await emitKernel('director', `DIRECTOR: ${taskId} завершён`, 'success');

    if (scope === 'command') {
      if (taskId === 'morningBriefing') await markBriefingDone(todayKey());
      if (taskId === 'eveningDebrief') await markDebriefDone(todayKey());
    }

    return { ok: true, insight };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Ошибка DIRECTOR';
    await emitKernel('director', `DIRECTOR: ${taskId} — ${error}`, 'error');
    return { ok: false, error };
  }
}

export async function applyAiActions(actions: AiAction[]): Promise<void> {
  await applyKernelActions(actions);
}

export async function testDirectorConnection(): Promise<{ ok: boolean; message: string }> {
  const cfg = getDirectorConfig();
  const valid = validateDirectorConfig(cfg);
  if (!valid.ok) return { ok: false, message: valid.error ?? 'Invalid' };

  const result = await callGroq(
    'Ответь одним словом: ONLINE',
    'ping',
    cfg
  );
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true, message: result.text.slice(0, 80) };
}
