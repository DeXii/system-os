import { TASK_KEYS } from '@/content/task-keys';
import { db, uid } from '../../db';
import type { WorkoutKind, WorkoutPlan } from '../../domain/types';
import { refreshDayReportCompliance } from '../../engines/command-compliance';
import { emitDomainEvent, emitKernel, emitOsRefresh } from '../../events/event-bus';
import { completeByTaskKey } from '../commands/complete';
import { afterFactWrite } from '../pipeline';

export interface WorkoutCompleteOptions {
  durationMin?: number;
  source?: 'manual' | 'live';
}

function isBarProtocolKind(kind: WorkoutKind): boolean {
  return (
    kind === 'hift' ||
    kind.startsWith('gpp_') ||
    kind === 'warmup' ||
    kind === 'stretch'
  );
}

function defaultDurationMin(plan: WorkoutPlan): number {
  return plan.exercises.reduce((a, e) => a + e.sets * 2, 15);
}

export async function afterWorkoutComplete(
  plan: WorkoutPlan,
  options?: WorkoutCompleteOptions
): Promise<void> {
  const today = plan.date;
  const kind = plan.kind ?? 'legacy';
  const sourceLabel = options?.source === 'manual' ? 'manual' : 'LIVE';
  await db.workoutPlans.update(plan.id, { status: 'completed' });

  const sessionType =
    kind === 'hift'
      ? 'hift'
      : kind.startsWith('gpp_')
        ? 'strength'
        : kind === 'warmup' || kind === 'stretch'
          ? 'recovery'
          : 'strength';

  const existingSession = await db.trainingSessions
    .where('date')
    .equals(today)
    .filter((s) => s.workoutPlanId === plan.id)
    .first();
  if (!existingSession) {
    await db.trainingSessions.add({
      id: uid(),
      date: today,
      type: sessionType,
      durationMin: options?.durationMin ?? defaultDurationMin(plan),
      intensity: kind === 'hift' ? 'high' : 'medium',
      notes: `${kind} ${sourceLabel}`,
      workoutKind: kind,
      workoutPlanId: plan.id,
    });
  }

  if (kind !== 'legacy') {
    const { incrementWorkoutTypeStat } = await import('../../engines/workout-stats');
    await incrementWorkoutTypeStat(kind, today);
  }

  const { recomputeFitnessLevels } = await import('../../engines/progression-engine');
  await recomputeFitnessLevels();

  await afterFactWrite({ type: 'WORKOUT_LOGGED', date: today, planId: plan.id, kind });
  await completeByTaskKey(TASK_KEYS.foundationWorkout, today, 'foundation');
  if (isBarProtocolKind(kind)) {
    await completeByTaskKey(TASK_KEYS.foundationGpp, today, 'foundation');
  }
  await refreshDayReportCompliance(today);
  await emitKernel(
    'foundation',
    `Тренировка завершена (${kind})`,
    'success',
    TASK_KEYS.foundationWorkout
  );
  emitOsRefresh();
}

export async function afterCardioComplete(
  sessionId: string,
  patch: { distanceKm?: number; avgHr?: number; maxHr?: number; durationMin?: number }
): Promise<void> {
  const session = await db.cardioSessions.get(sessionId);
  if (!session) return;
  await db.cardioSessions.update(sessionId, patch);
  const existingSession = await db.trainingSessions
    .where('date')
    .equals(session.date)
    .filter((s) => s.cardioSessionId === sessionId)
    .first();
  if (!existingSession) {
    await db.trainingSessions.add({
      id: uid(),
      date: session.date,
      type: 'cardio',
      durationMin: patch.durationMin ?? session.durationMin,
      intensity: session.kind === 'cardio_intense' ? 'high' : 'low',
      notes: session.notes,
      workoutKind: session.kind,
      cardioSessionId: sessionId,
    });
  }
  const { incrementWorkoutTypeStat } = await import('../../engines/workout-stats');
  await incrementWorkoutTypeStat(session.kind, session.date);
  await emitDomainEvent({ type: 'CARDIO_LOGGED', date: session.date, sessionId });
  await completeByTaskKey(TASK_KEYS.foundationCardio, session.date, 'foundation');
  await refreshDayReportCompliance(session.date);
  await emitKernel('foundation', 'Кардио завершено', 'success', TASK_KEYS.foundationCardio);
  emitOsRefresh();
}
