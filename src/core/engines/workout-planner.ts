import { BAR_EXERCISES } from '@/content/exercises-bars';
import { TASK_KEYS } from '@/content/task-keys';
import { db, todayKey, uid, weekdayIndex } from '../db';
import { computeReadiness } from './readiness';
import type {
  OperatorCalibration,
  PlannedExercise,
  ReadinessScores,
  WorkoutPlan,
} from '../domain/types';

function clampReps(n: number, min = 3, max = 12): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function getCalibration(): Promise<OperatorCalibration | null> {
  const row = await db.operatorCalibration.get('calibration');
  return row ?? null;
}

export async function saveCalibration(
  maxPullups: number,
  maxDips: number,
  plankSec: number
): Promise<OperatorCalibration> {
  const row: OperatorCalibration = {
    id: 'calibration',
    maxPullups,
    maxDips,
    plankSec,
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorCalibration.put(row);
  return row;
}

function workingReps(max: number, factor = 0.6): number {
  return clampReps(Math.floor(max * factor));
}

async function hadHeavyPullYesterday(): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const date = todayKey(since);
  const logs = await db.setLogs.where('date').equals(date).toArray();
  const pullIds = new Set(BAR_EXERCISES.filter((e) => e.pattern === 'pull').map((e) => e.id));
  return logs.some((l) => pullIds.has(l.exerciseId));
}

async function failedLastTwoSessions(exerciseId: string): Promise<boolean> {
  const logs = await db.setLogs
    .where('exerciseId')
    .equals(exerciseId)
    .reverse()
    .limit(12)
    .toArray();
  const byDate = new Map<string, typeof logs>();
  for (const l of logs) {
    const arr = byDate.get(l.date) ?? [];
    arr.push(l);
    byDate.set(l.date, arr);
  }
  const dates = [...byDate.keys()].sort().reverse().slice(0, 2);
  if (dates.length < 2) return false;
  return dates.every((d) => {
    const sets = byDate.get(d)!;
    return sets.some((s) => s.actualReps < s.targetReps);
  });
}

export async function buildWorkoutPlan(
  date = todayKey(),
  readiness?: ReadinessScores
): Promise<WorkoutPlan> {
  const r = readiness ?? (await computeReadiness());
  const cal = await getCalibration();
  const maxPull = cal?.maxPullups ?? 5;
  const maxDip = cal?.maxDips ?? 8;
  const sets = r.foundation >= 60 ? 4 : 3;
  let deload = r.foundation < 45;

  const yesterdayCompliance = await db.dayReports
    .where('date')
    .equals(
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return todayKey(d);
      })()
    )
    .first();
  if (yesterdayCompliance && yesterdayCompliance.compliance < 50) deload = true;

  const wd = weekdayIndex(new Date(date + 'T12:00:00'));
  const pullHeavy = wd % 2 === 1;
  const skipHeavyPull = await hadHeavyPullYesterday();

  const exercises: PlannedExercise[] = [];
  const pullReps = deload
    ? clampReps(workingReps(maxPull) * 0.8)
    : workingReps(maxPull);
  const dipReps = deload
    ? clampReps(workingReps(maxDip) * 0.8)
    : workingReps(maxDip);
  const restPull = deload ? 105 : 90;
  const restPush = deload ? 75 : 60;

  if (!skipHeavyPull && pullHeavy) {
    exercises.push({
      exerciseId: maxPull >= 8 ? 'pullup' : 'australian',
      sets: deload ? Math.max(2, sets - 1) : sets,
      targetReps: pullReps,
      restSec: restPull,
    });
  } else {
    exercises.push({
      exerciseId: 'dip',
      sets: deload ? Math.max(2, sets - 1) : sets,
      targetReps: dipReps,
      restSec: restPush,
    });
  }

  exercises.push({
    exerciseId: pullHeavy ? 'dip' : 'pullup',
    sets: deload ? Math.max(2, sets - 1) : sets,
    targetReps: pullHeavy ? dipReps : pullReps,
    restSec: pullHeavy ? restPush : restPull,
  });

  exercises.push({
    exerciseId: 'knee_raise',
    sets: 3,
    targetReps: deload ? 8 : 10,
    restSec: 60,
  });

  exercises.push({
    exerciseId: 'plank',
    sets: 2,
    targetReps: cal?.plankSec ?? 45,
    restSec: 45,
  });

  for (const ex of exercises) {
    if (await failedLastTwoSessions(ex.exerciseId)) {
      ex.targetReps = clampReps(ex.targetReps - 1, 2, 12);
      ex.sets = Math.max(2, ex.sets - 1);
    }
  }

  const plan: WorkoutPlan = {
    id: uid(),
    date,
    exercises,
    status: 'planned',
    notes: deload ? 'Deload: сниженная нагрузка' : undefined,
  };
  await db.workoutPlans.put(plan);
  return plan;
}

export async function getTodayWorkoutPlan(date = todayKey()): Promise<WorkoutPlan | undefined> {
  const plans = await db.workoutPlans.where('date').equals(date).toArray();
  return plans.sort((a, b) => b.id.localeCompare(a.id))[0];
}

export async function ensureTodayWorkoutPlan(): Promise<WorkoutPlan> {
  const existing = await getTodayWorkoutPlan();
  if (existing && existing.status !== 'completed') return existing;
  return buildWorkoutPlan();
}

export function workoutTaskKey(): string {
  return TASK_KEYS.foundationWorkout;
}

export async function applyWorkoutPlanFromDirector(
  rawExercises: unknown[],
  date = todayKey()
): Promise<WorkoutPlan> {
  const allowed = new Set(BAR_EXERCISES.map((e) => e.id));
  const exercises: PlannedExercise[] = [];
  for (const raw of rawExercises) {
    if (!raw || typeof raw !== 'object') continue;
    const ex = raw as Record<string, unknown>;
    const exerciseId = String(ex.exerciseId ?? '');
    if (!allowed.has(exerciseId)) continue;
    exercises.push({
      exerciseId,
      sets: Math.max(1, Number(ex.sets) || 3),
      targetReps: Math.max(1, Number(ex.targetReps) || 8),
      restSec: Math.max(30, Number(ex.restSec) || 60),
    });
  }
  if (exercises.length === 0) {
    return buildWorkoutPlan(date);
  }
  const existing = await getTodayWorkoutPlan(date);
  const plan: WorkoutPlan = {
    id: existing?.id ?? uid(),
    date,
    exercises,
    status: 'planned',
    notes: 'План от DIRECTOR',
  };
  await db.workoutPlans.put(plan);
  return plan;
}
