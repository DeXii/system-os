import { useEffect, useMemo, useState } from 'react';
import { db } from '@/core/db';
import { DIRECTOR_TASKS, getTaskMeta, type TaskId } from '@/core/ai/director-tasks';
import type { ModuleId } from '@/core/domain/types';
import { subscribeKernel, subscribeOsRefresh } from '@/core/events/event-bus';
import { useDirectorRunner } from '@/modules/director/hooks/useDirectorRunner';
import { ActionCards } from '@/modules/director/components/ActionCards';

const SCOPE_OPTIONS: Array<ModuleId | 'full' | ''> = [
  '',
  'full',
  'command',
  'foundation',
  'nutrition',
  'regulation',
  'mind',
  'influence',
  'library',
  'integration',
  'director',
  'archive',
];

interface Props {
  onApplied?: () => void;
}

export function InsightsHistoryPanel({ onApplied }: Props) {
  const {
    loading,
    output,
    insight,
    history,
    applyActions,
    selectInsight,
    refreshHistory,
    setInsight,
    setOutput,
  } = useDirectorRunner({ scope: 'full', loadHistory: true, historyLimit: 200 });

  const [scopeFilter, setScopeFilter] = useState<ModuleId | 'full' | ''>('');
  const [taskFilter, setTaskFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const refresh = () => void refreshHistory();
    const unsubK = subscribeKernel(refresh);
    const unsubR = subscribeOsRefresh(refresh);
    return () => {
      unsubK();
      unsubR();
    };
  }, [refreshHistory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((h) => {
      if (scopeFilter && h.scope !== scopeFilter) return false;
      if (taskFilter && h.taskId !== taskFilter) return false;
      if (q && !h.text.toLowerCase().includes(q) && !h.taskId.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [history, scopeFilter, taskFilter, search]);

  const taskIds = useMemo(() => {
    const ids = new Set(history.map((h) => h.taskId));
    return Array.from(ids).sort();
  }, [history]);

  const handleApply = async (actions: Parameters<typeof applyActions>[0]) => {
    await applyActions(actions);
    onApplied?.();
  };

  const deleteInsight = async (id: string) => {
    if (!window.confirm('Удалить этот insight?')) return;
    await db.aiInsights.delete(id);
    if (insight?.id === id) {
      setInsight(null);
      setOutput('');
    }
    await refreshHistory();
  };

  const clearAll = async () => {
    if (!window.confirm('Очистить всю историю insights? Это необратимо.')) return;
    await db.aiInsights.clear();
    await refreshHistory();
  };

  const labelFor = (taskId: string) => getTaskMeta(taskId as TaskId)?.label ?? taskId;

  return (
    <div className="panel">
      <div className="panel-title">DIRECTOR Insights History</div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
        Полный архив ответов DIRECTOR. Выберите запись, чтобы просмотреть текст и повторно применить
        действия OS.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select
          className="input"
          style={{ maxWidth: 140 }}
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as ModuleId | 'full' | '')}
        >
          <option value="">Все scope</option>
          {SCOPE_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ maxWidth: 160 }}
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value)}
        >
          <option value="">Все задачи</option>
          {taskIds.map((id) => (
            <option key={id} value={id}>
              {labelFor(id)}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ flex: 1, minWidth: 120 }}
          placeholder="Поиск по тексту…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn btn-sm" onClick={() => void refreshHistory()}>
          Обновить
        </button>
        <button type="button" className="btn btn-sm" onClick={() => void clearAll()}>
          Очистить всё
        </button>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Нет записей</p>
      ) : (
        <div style={{ maxHeight: 220, overflow: 'auto', marginBottom: 12 }}>
          {filtered.map((h) => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <button
                type="button"
                className={`director-history-item ${insight?.id === h.id ? 'selected' : ''}`}
                style={{ flex: 1 }}
                onClick={() => selectInsight(h)}
              >
                [{h.scope}] {labelFor(h.taskId)} · {h.createdAt.slice(0, 16)} —{' '}
                {h.text.slice(0, 80)}
                {h.text.length > 80 ? '…' : ''}
                {h.actions.length > 0 ? ` · ${h.actions.length} actions` : ''}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                title="Удалить"
                onClick={() => void deleteInsight(h.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {insight && (
        <>
          <div className="panel-title" style={{ marginTop: 8 }}>
            {labelFor(insight.taskId)} · {insight.createdAt.slice(0, 19).replace('T', ' ')}
          </div>
          <div className="director-output">
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{output || insight.text}</pre>
          </div>
          {insight.actions.length > 0 && (
            <ActionCards
              actions={insight.actions}
              loading={loading}
              onApply={handleApply}
            />
          )}
        </>
      )}

      {!insight && history.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Задачи DIRECTOR: {DIRECTOR_TASKS.filter((t) => t.core).map((t) => t.label).join(', ')}
        </p>
      )}
    </div>
  );
}
