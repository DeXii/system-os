import { useState } from 'react';
import type { DirectorTaskMeta } from '@/core/ai/director-tasks';
import type { TaskId } from '@/core/ai/director-tasks';
import type { ModuleId } from '@/core/domain/types';
import { useDirectorRunner } from '../hooks/useDirectorRunner';
import { TerminalBlock } from '@/ui/components/TerminalBlock';
import { ActionCards } from './ActionCards';

interface Props {
  title: string;
  scope: ModuleId | 'full';
  tasks: DirectorTaskMeta[];
  onApplied?: () => void;
  compact?: boolean;
  variant?: 'panel' | 'sidebar';
  showHistory?: boolean;
  freeInputPlaceholder?: string;
  applyLabel?: string;
  hideHeader?: boolean;
}

export function DirectorTaskPanel({
  title,
  scope,
  tasks,
  onApplied,
  compact,
  variant = 'panel',
  showHistory = !compact,
  freeInputPlaceholder = 'Команда оператора...',
  applyLabel,
  hideHeader = false,
}: Props) {
  const [freeInput, setFreeInput] = useState('');
  const {
    status,
    loading,
    output,
    insight,
    history,
    run,
    applyActions,
    selectInsight,
  } = useDirectorRunner({ scope, loadHistory: showHistory });

  const handleRun = async (taskId: TaskId, userMessage?: string) => {
    const res = await run(taskId, userMessage);
    if (res.ok) onApplied?.();
  };

  const handleApply = async (selected: Parameters<typeof applyActions>[0]) => {
    await applyActions(selected);
    onApplied?.();
  };

  const hasWorkoutPlan = insight?.actions.some((a) => a.type === 'set_workout_plan');
  const resolvedApplyLabel =
    applyLabel ??
    (hasWorkoutPlan ? 'Принять план DIRECTOR' : undefined);

  const taskButtons = tasks.filter((t) => t.id !== 'freeCommand');

  if (compact || variant === 'sidebar') {
    return (
      <>
        {!hideHeader && (
          <div className="director-header">
            <span className={`director-status ${status}`}>{status.toUpperCase()}</span>
          </div>
        )}
        <div className="director-body">
          {output && <TerminalBlock>{output}</TerminalBlock>}
          {insight && !loading && insight.actions.length > 0 && (
            <ActionCards
              actions={insight.actions}
              loading={loading}
              compact
              applyLabel={resolvedApplyLabel}
              onApply={handleApply}
            />
          )}
          <div className="form-row" style={{ marginTop: '0.5rem' }}>
            <input
              className="input"
              placeholder={freeInputPlaceholder}
              value={freeInput}
              onChange={(e) => setFreeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && freeInput.trim() && !loading) {
                  void handleRun('freeCommand', freeInput.trim());
                }
              }}
              disabled={loading}
            />
          </div>
        </div>
        <div className="director-tasks">
          {taskButtons.map((t) => (
            <button
              key={t.id}
              type="button"
              className="btn btn-sm"
              disabled={loading || status !== 'online'}
              onClick={() => handleRun(t.id as TaskId)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <div className="mb-sm text-xs text-dim">
        <span className={`director-status ${status}`}>{status.toUpperCase()}</span>
        {status !== 'online' && ' · GROQ → ARCHIVE'}
      </div>

      <div className="form-row" style={{ marginBottom: 8 }}>
        <input
          className="input"
          placeholder={freeInputPlaceholder}
          value={freeInput}
          onChange={(e) => setFreeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              const msg = freeInput.trim();
              if (msg) void handleRun('freeCommand', msg);
              else {
                const coach = tasks.find((t) => t.id.endsWith('Coach'));
                if (coach) void handleRun(coach.id as TaskId);
              }
            }
          }}
          disabled={loading}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {taskButtons.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn btn-sm"
            disabled={loading}
            onClick={() => handleRun(t.id as TaskId)}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading || !freeInput.trim()}
          onClick={() => handleRun('freeCommand', freeInput.trim())}
        >
          Спросить
        </button>
      </div>

      {output && (
        <div className="mb-sm">
          <TerminalBlock>{output}</TerminalBlock>
        </div>
      )}

      {insight && !loading && insight.actions.length > 0 && (
        <ActionCards
          actions={insight.actions}
          loading={loading}
          applyLabel={resolvedApplyLabel}
          onApply={handleApply}
        />
      )}

      {showHistory && history.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className="mind-hint" style={{ fontSize: 11, cursor: 'pointer' }}>
            История insights ({history.length})
          </summary>
          {history.slice(0, 8).map((h) => (
            <button
              key={h.id}
              type="button"
              className="director-history-item"
              onClick={() => selectInsight(h)}
            >
              [{h.taskId}] {h.createdAt.slice(0, 16)} — {h.text.slice(0, 80)}…
            </button>
          ))}
        </details>
      )}
    </div>
  );
}
