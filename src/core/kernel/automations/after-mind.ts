import { TASK_KEYS } from '@/content/task-keys';
import { db, uid } from '../../db';
import type {
  ChessGoSession,
  DecisionLogEntry,
  ReflectionEntry,
  ScenarioAnalysis,
  StudySession,
} from '../../domain/types';
import { computeFollowUpDueDate, ensureDecisionFollowUpMission } from '../../engines/decision-followup';
import { afterFactWrite } from '../pipeline';
import { completeByTaskKey, completeMindPractice } from '../commands/complete';

export async function afterChessGoComplete(
  session: Omit<ChessGoSession, 'id'>
): Promise<ChessGoSession> {
  const entry: ChessGoSession = {
    ...session,
    id: uid(),
    ratingAfter: session.ratingAfter ?? session.rating,
  };
  await db.chessGoSessions.add(entry);
  await afterFactWrite({ type: 'CHESS_LOGGED', date: entry.date, entryId: entry.id });
  await completeMindPractice(
    TASK_KEYS.mindChess,
    `${entry.game === 'chess' ? 'Шахматы' : 'Go'} ${entry.durationMin} мин`,
    entry.date
  );
  return entry;
}

export async function afterReflectionComplete(
  entry: Omit<ReflectionEntry, 'id'>
): Promise<ReflectionEntry> {
  const row: ReflectionEntry = { ...entry, id: uid() };
  await db.reflections.add(row);
  await afterFactWrite({ type: 'REFLECTION_LOGGED', date: row.date, entryId: row.id });
  const taskKey =
    row.mode === 'pmr_extended' ? TASK_KEYS.mindReflectExtended : TASK_KEYS.mindReflectShort;
  await completeMindPractice(taskKey, `Метапознание (${row.mode ?? 'pmr'})`, row.date);
  await completeByTaskKey(TASK_KEYS.mindReflect, row.date, 'mind');
  return row;
}

export async function afterScenarioComplete(
  scenario: Omit<ScenarioAnalysis, 'id'>,
  options?: { decisionLog?: Omit<DecisionLogEntry, 'id'> }
): Promise<ScenarioAnalysis> {
  const row: ScenarioAnalysis = { ...scenario, id: uid() };
  await db.scenarios.add(row);
  if (options?.decisionLog) {
    const log = await afterDecisionLogComplete({
      ...options.decisionLog,
      linkedScenarioId: row.id,
    });
    await db.scenarios.update(row.id, { linkedDecisionId: log.id });
  }
  await completeMindPractice(
    TASK_KEYS.mindScenario,
    `Сценарий: ${row.title.slice(0, 40)}`,
    row.date
  );
  return row;
}

export async function afterDecisionLogComplete(
  entry: Omit<DecisionLogEntry, 'id'>
): Promise<DecisionLogEntry> {
  const followUpDueDate =
    entry.actualOutcome?.trim()
      ? entry.followUpDueDate
      : entry.followUpDueDate ?? computeFollowUpDueDate(entry.date);
  const row: DecisionLogEntry = {
    ...entry,
    id: uid(),
    followUpDueDate: entry.actualOutcome?.trim() ? followUpDueDate : followUpDueDate,
    followUpDone: entry.actualOutcome?.trim() ? true : entry.followUpDone,
  };
  await db.decisionLogs.add(row);
  await completeMindPractice(
    TASK_KEYS.mindDecisionLog,
    `Решение: ${row.title.slice(0, 40)}`,
    row.date
  );
  if (!row.actualOutcome?.trim()) {
    await ensureDecisionFollowUpMission();
  }
  return row;
}

export async function afterStudySessionComplete(
  entry: Omit<StudySession, 'id'>
): Promise<StudySession> {
  const row: StudySession = { ...entry, id: uid() };
  await db.studySessions.add(row);
  await completeMindPractice(
    TASK_KEYS.mindStudy,
    `Учёба: ${row.subject} — ${row.topic.slice(0, 30)}`,
    row.date
  );
  return row;
}
