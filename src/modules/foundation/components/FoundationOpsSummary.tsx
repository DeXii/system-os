import { useCallback, useEffect, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import { subscribeOsRefresh } from '@/core/events/event-bus';
import { TASK_KEYS } from '@/content/task-keys';
import {
  buildFoundationDirective,
  getFoundationOpsSummary,
} from '@/core/engines/foundation-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';

interface Props {
  onRefresh?: () => void;
}

export function FoundationOpsSummary({ onRefresh }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getFoundationOpsSummary>> | null>(
    null
  );
  const [directive, setDirective] = useState<string | null>(null);
  const [queueHint, setQueueHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await getFoundationOpsSummary();
    const d = await buildFoundationDirective();
    const slot = await findSlotByTaskKey(TASK_KEYS.foundationWorkout);
    setStats(s);
    setDirective(
      [d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n')
    );
    setQueueHint(slot ? `#${slot.rank} ${slot.title}` : null);
    onRefresh?.();
  }, [onRefresh]);

  useAsyncEffect(
    async (signal) => {
      await load();
      if (signal.aborted) return;
    },
    [load]
  );

  useEffect(() => subscribeOsRefresh(() => void load()), [load]);

  if (!stats) return null;

  return (
    <div className="panel">
      <div className="panel-title">FOUNDATION Ops — 7 дней</div>
      {queueHint && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          Сегодня в COMMAND: {queueHint}
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
      <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
        <div>Foundation score: {stats.foundationScore}</div>
        <div>Сессий / подходов 7д: {stats.sessions7d} / {stats.setLogs7d}</div>
        <div>Последний HIFT: {stats.hiftLast ?? '—'}</div>
        <div>Рек. GPP: {stats.recommendedGpp}</div>
        <div>Fatigue: {stats.fatigue.toFixed(2)}</div>
        <div>Pull / Push: {stats.strengthPull.toFixed(2)} / {stats.strengthPush.toFixed(2)}</div>
        <div>Recovery prior: {stats.recoveryPrior.toFixed(2)}</div>
        <div>
          HRV: {stats.hrvBaseline ?? '—'}
          {stats.hrvBelowBaseline ? ' · ниже baseline' : ''}
        </div>
        <div>
          Нагрузка сегодня: ×{stats.loadModifiers.volumeMultiplier.toFixed(2)}
          {stats.loadModifiers.deload ? ' (deload)' : ''}
        </div>
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={load}>
        Обновить
      </button>
    </div>
  );
}
