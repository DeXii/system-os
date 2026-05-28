import { TASK_KEYS } from '@/content/task-keys';
import { db, uid } from '../../db';
import type {
  BreathingSession,
  HrvEntry,
  MindfulnessSession,
  PstEntry,
  StressLogEntry,
  TriggerLog,
} from '../../domain/types';
import { summarizeBreathingSession } from '../../engines/regulation-metrics';
import { completeRegulationPractice } from '../commands/complete';
import { afterFactWrite } from '../pipeline';

export async function afterBreathingComplete(
  session: Omit<BreathingSession, 'id'>
): Promise<BreathingSession> {
  const entry: BreathingSession = { ...session, id: uid() };
  await db.breathingSessions.add(entry);
  await afterFactWrite({
    type: 'BREATHING_LOGGED',
    date: session.date,
    entryId: entry.id,
    mode: session.mode,
  });
  const taskKey =
    session.mode === 'wim_hof'
      ? TASK_KEYS.regulationBreathingWimhof
      : TASK_KEYS.regulationBreathingResonant;
  await completeRegulationPractice(
    taskKey,
    `Дыхание: ${summarizeBreathingSession(entry)}`,
    session.date
  );
  return entry;
}

export async function afterMindfulnessComplete(
  session: Omit<MindfulnessSession, 'id'>
): Promise<MindfulnessSession> {
  const entry: MindfulnessSession = { ...session, id: uid() };
  await db.mindfulnessSessions.add(entry);
  await afterFactWrite({
    type: 'MINDFULNESS_LOGGED',
    date: session.date,
    entryId: entry.id,
  });
  await completeRegulationPractice(
    TASK_KEYS.regulationMindfulness,
    `Mindfulness ${session.durationMin} мин (${session.type})`,
    session.date
  );
  return entry;
}

export async function afterStressLogComplete(
  entry: Omit<StressLogEntry, 'id'>,
  options?: { pstEntry?: Omit<PstEntry, 'id'> }
): Promise<StressLogEntry> {
  const log: StressLogEntry = { ...entry, id: uid() };
  await db.stressLogs.add(log);
  await afterFactWrite({ type: 'STRESS_LOGGED', date: entry.date, entryId: log.id });
  await completeRegulationPractice(
    TASK_KEYS.regulationStress,
    `Stress log: ${entry.trigger.slice(0, 40)}`,
    entry.date
  );
  if (options?.pstEntry) {
    const pst: PstEntry = { ...options.pstEntry, id: uid() };
    await db.pstEntries.add(pst);
    await completeRegulationPractice(TASK_KEYS.regulationPst, 'PST запись сохранена', entry.date);
  }
  return log;
}

export async function afterHrvComplete(entry: Omit<HrvEntry, 'id'>): Promise<void> {
  const row = { ...entry, id: uid() };
  await db.hrvEntries.add(row);
  await afterFactWrite({ type: 'HRV_LOGGED', date: entry.date, entryId: row.id });
  await completeRegulationPractice(TASK_KEYS.regulationHrv, 'HRV записан', entry.date);
}

export async function afterTriggerLogComplete(entry: Omit<TriggerLog, 'id'>): Promise<TriggerLog> {
  const row: TriggerLog = { ...entry, id: uid() };
  await db.triggerLogs.add(row);
  const { completeByTaskKey } = await import('../commands/complete');
  const { refreshDayReportCompliance } = await import('../../engines/command-compliance');
  const { emitKernel, emitOsRefresh } = await import('../../events/event-bus');
  await completeByTaskKey(TASK_KEYS.regulationTriggerLog, row.date, 'regulation');
  await refreshDayReportCompliance(row.date);
  await emitKernel('regulation', `Триггер: маска ${row.maskScore}/5`, 'success');
  emitOsRefresh();
  return row;
}
