import { useEffect, useState } from 'react';
import { TASK_KEYS } from '@/content/task-keys';
import { getMindOpsSummary } from '@/core/engines/mind-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';

interface Props {
  onRefresh?: () => void;
}

export function MindOpsSummary({ onRefresh }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getMindOpsSummary>> | null>(null);
  const [hints, setHints] = useState<string[]>([]);

  const load = async () => {
    setStats(await getMindOpsSummary());
    const queueHints: string[] = [];
    for (const key of [
      TASK_KEYS.mindChess,
      TASK_KEYS.mindReflectShort,
      TASK_KEYS.mindScenario,
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

  const l3 = stats.readingProgress[3];

  return (
    <div className="panel">
      <div className="panel-title">MIND Ops — 7 дней</div>
      {hints.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>{hints.join(' · ')}</p>
      )}
      <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
        <div>Chess/Go: {stats.chessSessions7d} сессий</div>
        <div>Минут: {stats.chessMinutes7d}</div>
        <div>Рефлексии: {stats.reflections7d}</div>
        <div>Сценарии: {stats.scenarios7d}</div>
        <div>Decision logs: {stats.decisions7d}</div>
        <div>Study: {stats.studySessions7d}</div>
        <div>Closure 14d: {stats.decisionClosurePct14d}%</div>
        <div>Streak: {stats.streak} дн</div>
        <div>
          Чтение L3: {l3.read}/{l3.total}
        </div>
        <div>
          Weekly reading: {stats.weeklyReading.missionDone ? 'done' : 'pending'}
        </div>
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={load}>
        Обновить
      </button>
    </div>
  );
}
