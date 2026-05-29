import { useCallback, useEffect, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import { TASK_KEYS } from '@/content/task-keys';
import { getInfluenceOpsSummary } from '@/core/engines/influence-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { subscribeOsRefresh } from '@/core/events/event-bus';
interface Props {
  onRefresh?: () => void;
}

export function InfluenceOpsSummary({ onRefresh }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getInfluenceOpsSummary>> | null>(
    null
  );
  const [hints, setHints] = useState<string[]>([]);

  const load = useCallback(async () => {
    setStats(await getInfluenceOpsSummary());
    const queueHints: string[] = [];
    for (const key of [
      TASK_KEYS.influenceMi,
      TASK_KEYS.influenceNudge,
      TASK_KEYS.influenceProtocol,
    ]) {
      const slot = await findSlotByTaskKey(key);
      if (slot?.status === 'pending') {
        queueHints.push(`#${slot.rank} COMMAND: ${slot.title}`);
      }
    }
    setHints(queueHints);
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
      <div className="panel-title">INFLUENCE Ops · 7 дней · Тактика класса</div>
      {hints.length > 0 && (
        <div className="text-xs mb-sm" style={{ color: 'var(--accent)' }}>
          {hints.join(' · ')}
        </div>
      )}
      <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
        <div>MI (OARS): {stats.miCount7d}</div>
        <div>Nudge: {stats.nudgeCount7d}</div>
        <div>Protocol дней: {stats.protocolDays7d}</div>
        <div>Bias: {stats.biasCount7d}</div>
        <div>Obs/Debrief: {stats.observationCount7d}</div>
        <div>Всего: {stats.total7d}</div>
        <div>MI streak: {stats.miStreak}</div>
        <div>Protocol сегодня: {stats.protocolToday ? 'да' : 'нет'}</div>
      </div>
    </div>
  );
}
