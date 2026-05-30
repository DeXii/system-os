import { useCallback, useEffect, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import { subscribeOsRefresh } from '@/core/events/event-bus';
import { TASK_KEYS } from '@/content/task-keys';
import {
  buildNutritionDirective,
  getNutritionOpsSummary,
} from '@/core/engines/nutrition-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';

interface Props {
  reloadToken: number;
}

export function NutritionOpsSummary({ reloadToken }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getNutritionOpsSummary>> | null>(
    null
  );
  const [directive, setDirective] = useState<string | null>(null);
  const [queueLog, setQueueLog] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await getNutritionOpsSummary();
    const d = await buildNutritionDirective();
    const slot = await findSlotByTaskKey(TASK_KEYS.nutritionLog);
    setStats(s);
    setDirective([d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n'));
    setQueueLog(slot ? `#${slot.rank} ${slot.title}` : null);
  }, []);

  useAsyncEffect(
    async (signal) => {
      await load();
      if (signal.aborted) return;
    },
    [load, reloadToken]
  );

  useEffect(() => subscribeOsRefresh(() => void load()), [load]);

  if (!stats) return null;

  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div className="panel-title">NUTRITION Ops</div>
      {queueLog && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          Сегодня в COMMAND: {queueLog}
        </p>
      )}
      {directive && (
        <pre
          style={{
            fontSize: 11,
            fontFamily: 'var(--mono)',
            color: 'var(--text-dim)',
            whiteSpace: 'pre-wrap',
            marginBottom: 8,
          }}
        >
          {directive}
        </pre>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <span className="muted">Streak</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.streak} дн.</div>
        </div>
        <div>
          <span className="muted">Consistency 7d</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.consistency7d}%</div>
        </div>
        <div>
          <span className="muted">Белок сегодня</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {stats.proteinToday}/{stats.proteinTarget}g
          </div>
        </div>
        <div>
          <span className="muted">Цель</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.goalType ?? '—'}</div>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          Обновить
        </button>
      </div>
    </div>
  );
}
