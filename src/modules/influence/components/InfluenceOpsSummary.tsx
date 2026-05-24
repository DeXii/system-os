import { useEffect, useState } from 'react';
import { TASK_KEYS } from '@/content/task-keys';
import { getInfluenceOpsSummary } from '@/core/engines/influence-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onRefresh?: () => void;
}

export function InfluenceOpsSummary({ onRefresh }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getInfluenceOpsSummary>> | null>(
    null
  );
  const [hints, setHints] = useState<string[]>([]);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

  if (!stats) return null;

  return (
    <div className="panel">
      <div className="panel-title">INFLUENCE Ops · 7 дней · Тактика класса</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Influence: MI (motivational interviewing), nudge, ethics protocol, bias log и observation
          debrief за 7 дней.
        </p>
      </GlossaryZone>
      {hints.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          {hints.join(' · ')}
        </p>
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
