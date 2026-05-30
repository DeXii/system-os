import { useCallback, useEffect, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import { subscribeOsRefresh } from '@/core/events/event-bus';
import { TASK_KEYS } from '@/content/task-keys';
import {
  buildRegulationDirective,
  getRegulationOpsSummary,
} from '@/core/engines/regulation-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onRefresh?: () => void;
}

export function RegulationOpsSummary({ onRefresh }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getRegulationOpsSummary>> | null>(
    null
  );
  const [directive, setDirective] = useState<string | null>(null);
  const [queueHrv, setQueueHrv] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await getRegulationOpsSummary();
    const d = await buildRegulationDirective();
    const slot = await findSlotByTaskKey(TASK_KEYS.regulationHrv);
    setStats(s);
    setDirective([d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n'));
    setQueueHrv(slot ? `#${slot.rank} ${slot.title}` : null);
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
      <div className="panel-title">REGULATION Ops — 7 дней</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Regulation: HRV, z-score, resonant breath, Wim Hof, mindfulness, stress/PST за 7 дней.
        </p>
      </GlossaryZone>
      {queueHrv && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          Сегодня в COMMAND: {queueHrv}
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
        <div>Regulation score: {stats.regulationScore}</div>
        <div>HRV записей: {stats.hrv7}</div>
        <div>Baseline: {stats.baseline ?? '—'} ms</div>
        <div>z_HRV сегодня: {stats.hrvZToday != null ? stats.hrvZToday.toFixed(2) : '—'}</div>
        <div>Субъектив: {stats.subjectiveToday ?? '—'}/10</div>
        <div>Резонанс / Wim: {stats.breath.resonant} / {stats.breath.wimHof}</div>
        <div>Резонанс мин 7д: {stats.resonantMin7d}</div>
        <div>Mindfulness: {stats.mindful7}</div>
        <div>Stress logs: {stats.stress7}</div>
        <div>PST efficacy (EMA): {stats.pstEfficacy.toFixed(2)}</div>
        <div>Wim tolerance: {stats.wimHofTolerance.toFixed(2)}</div>
        <div>Mask burden 7д: {stats.maskBurden7d?.toFixed(1) ?? '—'}</div>
        <div>Practice 14д (gate): {stats.practice14d}/14</div>
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={load}>
        Обновить
      </button>
    </div>
  );
}
