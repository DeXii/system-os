import { db, dateKeyDaysAgo, todayKey, toLocalDateKey } from '../db';
import type { DecisionLogEntry } from '../domain/types';
import { updateMindParamsFromDecisionOutcome } from './mind-params';

const DEFAULT_FOLLOWUP_DAYS = 7;

export function computeFollowUpDueDate(fromDate = todayKey()): string {
  const d = new Date(fromDate + 'T12:00:00');
  d.setDate(d.getDate() + DEFAULT_FOLLOWUP_DAYS);
  return toLocalDateKey(d);
}

function isOpenFollowUp(l: DecisionLogEntry): boolean {
  return !l.followUpDone && !l.actualOutcome?.trim();
}

export async function getPendingDecisionFollowUps(): Promise<DecisionLogEntry[]> {
  const today = todayKey();
  const logs = await db.decisionLogs
    .where('followUpDueDate')
    .between('', today)
    .filter((l) => isOpenFollowUp(l))
    .toArray();
  return logs.sort((a, b) => (a.followUpDueDate ?? '').localeCompare(b.followUpDueDate ?? ''));
}

export async function getUpcomingDecisionFollowUps(withinDays = 3): Promise<DecisionLogEntry[]> {
  const today = todayKey();
  const until = dateKeyDaysAgo(-withinDays);
  const logs = await db.decisionLogs
    .where('followUpDueDate')
    .between(today, until, false, true)
    .filter((l) => isOpenFollowUp(l))
    .toArray();
  return logs.sort((a, b) => (a.followUpDueDate ?? '').localeCompare(b.followUpDueDate ?? ''));
}

export async function getDecisionClosureRate14d(): Promise<number> {
  const since = dateKeyDaysAgo(13);
  const logs = await db.decisionLogs.where('date').aboveOrEqual(since).toArray();
  if (logs.length === 0) return 0;
  const closed = logs.filter((l) => Boolean(l.actualOutcome?.trim()) || l.followUpDone).length;
  return Math.round((closed / logs.length) * 100);
}

export async function ensureDecisionFollowUpMission(date = todayKey()): Promise<void> {
  const pending = await getPendingDecisionFollowUps();
  if (pending.length === 0) return;

  const taskKey = 'mind.decision.followup';
  const existing = await db.missions
    .where('date')
    .equals(date)
    .filter((m) => m.taskKey === taskKey && m.status === 'pending')
    .first();
  if (existing) return;

  const profile = await db.operator.toCollection().first();
  if (!profile) return;

  const { uid } = await import('../db');
  await db.missions.add({
    id: uid(),
    date,
    title: `Закрыть исход решения: ${pending[0].title.slice(0, 50)}`,
    stage: 'mind',
    priority: 'critical',
    status: 'pending',
    source: 'protocol',
    taskKey,
    frequencyTier: 'intensive',
  });
}

export async function closeDecisionFollowUp(
  id: string,
  actualOutcome: string,
  outcomeScore?: DecisionLogEntry['outcomeScore']
): Promise<void> {
  await db.decisionLogs.update(id, {
    actualOutcome,
    followUpDone: true,
    ...(outcomeScore != null ? { outcomeScore } : {}),
  });
  const row = await db.decisionLogs.get(id);
  if (row) await updateMindParamsFromDecisionOutcome(row);
}
