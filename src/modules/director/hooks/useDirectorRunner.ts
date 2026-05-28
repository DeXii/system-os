import { useCallback, useEffect, useState } from 'react';
import { db } from '@/core/db';
import { applyAiActions, runDirectorTask } from '@/core/ai/director-service';
import { useDirectorStatus } from '@/hooks/useDirectorStatus';
import type { TaskId } from '@/core/ai/director-tasks';
import { resolveScope } from '@/core/ai/director-tasks';
import type { AiAction, AiInsight, ModuleId } from '@/core/domain/types';

export interface UseDirectorRunnerOptions {
  scope: ModuleId | 'full';
  loadHistory?: boolean;
  historyLimit?: number;
}

export function useDirectorRunner({
  scope,
  loadHistory = true,
  historyLimit = 20,
}: UseDirectorRunnerOptions) {
  const status = useDirectorStatus();
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [history, setHistory] = useState<AiInsight[]>([]);

  const refreshHistory = useCallback(async () => {
    const all = await db.aiInsights.orderBy('createdAt').reverse().limit(historyLimit).toArray();
    const filtered =
      scope === 'full'
        ? all
        : all.filter((i) => i.scope === scope || i.scope === 'full');
    setHistory(filtered);
  }, [scope, historyLimit]);

  useEffect(() => {
    if (!loadHistory) return;
    void refreshHistory();
  }, [loadHistory, refreshHistory]);

  const selectInsight = useCallback((item: AiInsight) => {
    setInsight(item);
    setOutput(item.text);
  }, []);

  const run = useCallback(
    async (taskId: TaskId, userMessage?: string) => {
      if (status !== 'online') {
        setOutput(
          status === 'needs_config'
            ? 'DIRECTOR не настроен. Укажите Groq API Key и Proxy URL во вкладке ARCHIVE.'
            : 'DIRECTOR offline. Настройте подключение в ARCHIVE.'
        );
        setInsight(null);
        return { ok: false as const, error: 'offline' };
      }
      setLoading(true);
      setInsight(null);
      setOutput('Сбор контекста...');
      const taskScope = resolveScope(taskId, scope);
      try {
        const res = await runDirectorTask(taskId, {
          scope: taskScope,
          userMessage,
          onProgress: setOutput,
        });
        if (!res.ok) {
          setOutput(res.error);
          setInsight(null);
          return res;
        }
        setInsight(res.insight);
        setOutput(res.insight.text);
        void refreshHistory();
        return res;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Ошибка DIRECTOR';
        setOutput(msg);
        setInsight(null);
        return { ok: false as const, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [status, scope, refreshHistory]
  );

  const applyActions = useCallback(
    async (actions?: AiAction[]) => {
      const toApply = actions ?? insight?.actions ?? [];
      if (!toApply.length) return;
      setLoading(true);
      try {
        await applyAiActions(toApply);
        setOutput((o) => o + '\n\n[Действия применены к OS]');
      } catch (e) {
        setOutput((o) => o + `\n\n[Ошибка: ${e instanceof Error ? e.message : 'apply failed'}]`);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [insight]
  );

  return {
    status,
    loading,
    output,
    insight,
    history,
    run,
    applyActions,
    selectInsight,
    refreshHistory,
    setOutput,
    setInsight,
  };
}
