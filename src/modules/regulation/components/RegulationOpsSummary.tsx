import { useEffect, useState } from 'react';
import { TASK_KEYS } from '@/content/task-keys';
import { db, dateKeyDaysAgo } from '@/core/db';
import {
  getBreathing7dSummary,
  getHrvBaseline14d,
  getRegulationStreak,
} from '@/core/engines/regulation-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onRefresh?: () => void;
}

export function RegulationOpsSummary({ onRefresh }: Props) {
  const [stats, setStats] = useState({
    hrv7: 0,
    breath: { resonant: 0, wimHof: 0, total: 0 },
    mindful7: 0,
    stress7: 0,
    streak: 0,
    baseline: null as number | null,
    queueHrv: null as string | null,
  });

  const load = async () => {
    const since = dateKeyDaysAgo(6);
    const hrv7 = await db.hrvEntries.where('date').aboveOrEqual(since).count();
    const mindful7 = await db.mindfulnessSessions.where('date').aboveOrEqual(since).count();
    const stress7 = await db.stressLogs.where('date').aboveOrEqual(since).count();
    const breath = await getBreathing7dSummary();
    const streak = await getRegulationStreak();
    const baseline = await getHrvBaseline14d();
    const slot = await findSlotByTaskKey(TASK_KEYS.regulationHrv);
    setStats({
      hrv7,
      breath,
      mindful7,
      stress7,
      streak,
      baseline,
      queueHrv: slot ? `#${slot.rank} ${slot.title}` : null,
    });
    onRefresh?.();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="panel">
      <div className="panel-title">REGULATION Ops — 7 дней</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Regulation: HRV и baseline, resonant breath, Wim Hof, mindfulness, MMFT и stress log за 7
          дней.
        </p>
      </GlossaryZone>
      {stats.queueHrv && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          Сегодня в COMMAND: {stats.queueHrv}
        </p>
      )}
      <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
        <div>HRV записей: {stats.hrv7}</div>
        <div>Baseline: {stats.baseline ?? '—'} ms</div>
        <div>Резонанс: {stats.breath.resonant}</div>
        <div>Wim Hof: {stats.breath.wimHof}</div>
        <div>Mindfulness: {stats.mindful7}</div>
        <div>Stress logs: {stats.stress7}</div>
        <div>Streak (HRV+дых+mind): {stats.streak} дн</div>
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={load}>
        Обновить
      </button>
    </div>
  );
}
