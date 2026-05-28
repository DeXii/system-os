import { TASK_KEYS } from '@/content/task-keys';
import { db, todayKey, uid } from '../../db';
import type { OperatorProfile } from '../../domain/types';
import { ensureDecisionFollowUpMission } from '../../engines/decision-followup';
import { generateFullStackMissions } from '../../engines/mission-generator';
import { generateFullStackProtocol } from '../../engines/protocol-generator';
import { weekStartKey } from '../../engines/library-books';
import { buildDay } from '../../engines/scheduler';
import { emitOsRefresh } from '../../events/event-bus';
import { afterFactWrite } from '../pipeline';

export async function ensureDayBootstrapped(profile: OperatorProfile, date = todayKey()) {
  await generateFullStackProtocol(profile, date);
  await generateFullStackMissions(profile, date);
  await ensureWeeklyReadingMission(profile, date);
  await ensureDecisionFollowUpMission(date);
  await ensureStudyMissionIfStale(profile, date);
  await buildDay(profile, date);
  await afterFactWrite({ type: 'DAY_BOOTSTRAPPED', date });
}

export async function ensureStudyMissionIfStale(
  profile: OperatorProfile,
  date = todayKey()
): Promise<void> {
  const { dateKeyDaysAgo } = await import('../../db');
  const since = dateKeyDaysAgo(4);
  const count = await db.studySessions.where('date').aboveOrEqual(since).count();
  if (count > 0) return;
  if (!profile.unlockedStages.includes('mind') && profile.currentStage !== 'mind') return;

  const taskKey = TASK_KEYS.mindStudy;
  const existing = await db.missions
    .where('date')
    .equals(date)
    .filter((m) => m.taskKey === taskKey && m.status === 'pending')
    .first();
  if (existing) return;

  await db.missions.add({
    id: uid(),
    date,
    title: 'Учёба: 30 мин по теме этапа',
    stage: 'mind',
    priority: 'routine',
    status: 'pending',
    source: 'protocol',
    taskKey,
    frequencyTier: 'maintenance',
  });
}

export async function ensureWeeklyReadingMission(
  profile: OperatorProfile,
  date = todayKey()
): Promise<void> {
  const since = weekStartKey(new Date(date + 'T12:00:00'));
  const existing = await db.missions
    .where('date')
    .aboveOrEqual(since)
    .filter((m) => m.taskKey === TASK_KEYS.readingWeekly)
    .first();
  if (existing) return;
  await db.missions.add({
    id: uid(),
    date,
    title: 'Чтение: 1 книга / N глав на неделю',
    stage: profile.currentStage,
    priority: 'routine',
    status: 'pending',
    source: 'protocol',
    taskKey: TASK_KEYS.readingWeekly,
    frequencyTier: 'maintenance',
  });
}

export async function syncDayFromGenerators(
  profile: OperatorProfile,
  date = todayKey()
): Promise<void> {
  await ensureDayBootstrapped(profile, date);
  emitOsRefresh();
}
