import { db, uid } from '../../db';
import type { AiAction, AiInsight, DirectorConfig, ModuleId } from '../../domain/types';
import { emitKernel, emitOsRefresh } from '../../events/event-bus';
import { markBriefingDone, markDebriefDone } from '../../engines/command-compliance';
import { applyDirectorActions as applyKernelActions } from '../../engines/os-kernel';
import { callGroq, testProxyHealth } from '../groq-client';
import {
  isDeepAnalysisTask,
  resolveLookbackDays,
  resolveScope,
  type ContextLookbackDays,
  type TaskId,
} from '../director-tasks';
import type { WorkoutContextOptions } from '../context-builder';
import { todayKey } from '../../db';
import { buildDirectorContext } from '../context-builder';
import { ALL_DIRECTOR_ACTION_TYPES } from '../prompts/registry/task-registry';
import {
  parseContextSnapshot,
  validateAndFilterActions,
} from '../prompts/validators/validate-actions';
import { buildDirectorPromptBundle, processDirectorResponse } from './director-router';
import { setLastDirectorPrompt } from '@/stores/director-prompt-store';

export { buildDirectorPromptBundle } from './director-router';
export { testProxyHealth } from '../groq-client';
export type { TaskId } from '../director-tasks';
export type { WorkoutContextOptions } from '../context-builder';

const LS_KEY = 'ayanakoji_groq_key';
const LS_PROXY = 'ayanakoji_groq_proxy';
const LS_TOKEN = 'ayanakoji_proxy_token';
const LS_MODEL = 'ayanakoji_groq_model';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const DEFAULT_PROXY = (import.meta.env.VITE_GROQ_PROXY_URL || '').trim().replace(/\/$/, '');
const DEFAULT_PROXY_TOKEN = (import.meta.env.VITE_PROXY_TOKEN || '').trim();

const directorStatusListeners = new Set<() => void>();

export function subscribeDirectorStatus(listener: () => void): () => void {
  directorStatusListeners.add(listener);
  return () => directorStatusListeners.delete(listener);
}

function notifyDirectorStatus(): void {
  directorStatusListeners.forEach((fn) => fn());
}

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
  notifyDirectorStatus();
}

export function resetDirectorProxyToBuild(): DirectorConfig {
  localStorage.removeItem(LS_PROXY);
  const next = getDirectorConfig();
  notifyDirectorStatus();
  return next;
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

const MAX_TOKENS_LOOKBACK_7 = 2048;
const MAX_TOKENS_DEEP = 8192;
const MAX_TOKENS_WORKOUT_PLAN = 4096;

const WORKOUT_PLAN_TASK_IDS = new Set<TaskId>([
  'planHift',
  'planGpp',
  'planWarmup',
  'planStretch',
  'planCardioIntense',
  'planCardioEasy',
  'planWorkout',
]);

function maxTokensForLookback(lookbackDays: ContextLookbackDays): number {
  return lookbackDays === 7 ? MAX_TOKENS_LOOKBACK_7 : MAX_TOKENS_DEEP;
}

function maxTokensForTask(taskId: TaskId, lookbackDays: ContextLookbackDays): number {
  if (WORKOUT_PLAN_TASK_IDS.has(taskId)) return MAX_TOKENS_WORKOUT_PLAN;
  return maxTokensForLookback(lookbackDays);
}

export type DirectorRunMeta = {
  rawActionCount: number;
  droppedCount: number;
};

export async function runDirectorTask(
  taskId: TaskId,
  options?: {
    userMessage?: string;
    scope?: ModuleId | 'full';
    lookbackDays?: ContextLookbackDays;
    onProgress?: (message: string) => void;
    workoutContext?: WorkoutContextOptions;
  }
): Promise<
  | { ok: true; insight: AiInsight; meta: DirectorRunMeta }
  | { ok: false; error: string }
> {
  const cfg = getDirectorConfig();
  const valid = validateDirectorConfig(cfg);
  if (!valid.ok) return { ok: false, error: valid.error ?? 'Invalid config' };

  const lookbackDays = resolveLookbackDays(taskId, options?.lookbackDays);
  const scope = isDeepAnalysisTask(taskId) ? 'full' : resolveScope(taskId, options?.scope);

  try {
    options?.onProgress?.(`Сбор контекста (${lookbackDays} дн.)...`);
    const bundle = await buildDirectorPromptBundle(taskId, options);

    setLastDirectorPrompt({
      taskId,
      scope,
      lookbackDays,
      system: bundle.system,
      user: bundle.user,
      contextJson: bundle.contextJson,
      contextJsonLength: bundle.contextJson.length,
      workoutContext: options?.workoutContext,
      createdAt: new Date().toISOString(),
      source: 'run',
    });

    options?.onProgress?.('Запрос к Groq...');
    const result = await callGroq(bundle.system, bundle.user, cfg, {
      maxTokens: maxTokensForTask(taskId, lookbackDays),
    });
    if (!result.ok) {
      await emitKernel(
        'director',
        `DIRECTOR: ${taskId} — ${result.error} (контекст ${bundle.contextJson.length} симв.)`,
        'error'
      );
      return result;
    }

    const { text: cleanText, actions, dropped, rawActionCount } = processDirectorResponse(
      result.text,
      bundle.contextJson,
      bundle.allowedActions
    );

    if (dropped.length > 0) {
      const sample = dropped
        .slice(0, 3)
        .map((d) => `${d.action.type}: ${d.reason}`)
        .join('; ');
      await emitKernel(
        'director',
        `DIRECTOR: отброшено ${dropped.length} действий (${sample})`,
        'warn'
      );
    } else if (rawActionCount > 0 && actions.length === 0) {
      await emitKernel(
        'director',
        `DIRECTOR: ${taskId} — все ${rawActionCount} действий отфильтрованы`,
        'warn'
      );
    }

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
      emitOsRefresh();
    }

    return {
      ok: true,
      insight,
      meta: { rawActionCount, droppedCount: dropped.length },
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Ошибка DIRECTOR';
    await emitKernel('director', `DIRECTOR: ${taskId} — ${error}`, 'error');
    return { ok: false, error };
  }
}

export async function applyAiActions(
  actions: AiAction[]
): Promise<{ applied: number; dropped: number }> {
  if (!actions.length) return { applied: 0, dropped: 0 };

  const contextJson = await buildDirectorContext('full', 7);
  const context = parseContextSnapshot(contextJson);
  const { actions: validated, dropped } = validateAndFilterActions(actions, {
    allowedActions: ALL_DIRECTOR_ACTION_TYPES,
    context,
  });

  if (dropped.length > 0) {
    const preview = dropped
      .slice(0, 3)
      .map((d) => `${d.action.type}: ${d.reason}`)
      .join('; ');
    await emitKernel(
      'director',
      `Apply: отброшено ${dropped.length} действий — ${preview}`,
      'warn'
    );
  }

  if (validated.length) {
    await applyKernelActions(validated);
  }

  return { applied: validated.length, dropped: dropped.length };
}

export async function testDirectorConnection(): Promise<{ ok: boolean; message: string }> {
  const cfg = getDirectorConfig();
  const valid = validateDirectorConfig(cfg);
  if (!valid.ok) return { ok: false, message: valid.error ?? 'Invalid' };

  const health = await testProxyHealth(cfg);
  if (!health.ok) {
    return { ok: false, message: `Worker: ${health.message}` };
  }

  const result = await callGroq('Ответь одним словом: ONLINE', 'ping', cfg, {
    maxTokens: 16,
  });
  if (!result.ok) return { ok: false, message: `Groq: ${result.error}` };
  return { ok: true, message: `Worker: ${health.message} · Groq: ${result.text.slice(0, 80)}` };
}
