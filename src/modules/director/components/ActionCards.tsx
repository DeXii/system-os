import { useEffect, useState } from 'react';
import type { AiAction } from '@/core/domain/types';
import {
  formatActionSummary,
  formatActionType,
  getWorkoutExercises,
} from '@/core/ai/action-labels';

interface Props {
  actions: AiAction[];
  loading?: boolean;
  compact?: boolean;
  applyLabel?: string;
  onApply: (selected: AiAction[]) => void | Promise<void>;
}

export function ActionCards({
  actions,
  loading,
  compact,
  applyLabel,
  onApply,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(actions.map((_, i) => i)));

  useEffect(() => {
    setSelected(new Set(actions.map((_, i) => i)));
  }, [actions]);

  if (!actions.length) return null;

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectedActions = actions.filter((_, i) => selected.has(i));

  const handleApply = (all: boolean) => {
    const toApply = all ? actions : selectedActions;
    if (!toApply.length) return;
    void onApply(toApply);
  };

  return (
    <div className={`action-cards ${compact ? 'action-cards-compact' : ''}`}>
      <div className="action-cards-header">
        <span className="action-cards-title">Действия OS</span>
        <span className="action-cards-count">{selected.size}/{actions.length}</span>
      </div>
      {actions.map((action, i) => (
        <label key={i} className="action-card">
          <input
            type="checkbox"
            checked={selected.has(i)}
            onChange={() => toggle(i)}
            disabled={loading}
          />
          <div className="action-card-body">
            <span className="action-card-type">{formatActionType(action.type)}</span>
            <span className="action-card-summary">{formatActionSummary(action)}</span>
            {action.type === 'set_workout_plan' && (
              <ul className="action-card-payload">
                {getWorkoutExercises(action).map((ex, j) => (
                  <li key={j}>
                    {ex.exerciseId}: {ex.sets ?? '?'}×{ex.targetReps ?? '?'}
                    {ex.restSec != null ? `, rest ${ex.restSec}s` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>
      ))}
      <div className="action-cards-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={loading || selectedActions.length === 0}
          onClick={() => handleApply(false)}
        >
          {applyLabel ?? `Применить выбранные (${selectedActions.length})`}
        </button>
        {selected.size < actions.length && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={loading}
            onClick={() => handleApply(true)}
          >
            Применить все ({actions.length})
          </button>
        )}
      </div>
    </div>
  );
}
