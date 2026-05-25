import {
  FITNESS_TIER_ORDER,
  type FitnessCategory,
  type FitnessTier,
  type OperatorFitnessLevels,
  type SetLog,
  type WorkoutKind,
} from '@/core/domain/types';
import { fitnessCategoryForKind } from '@/content/exercises';
import { db, dateKeyDaysAgo } from '../db';

const DEFAULT_LEVELS: OperatorFitnessLevels = {
  id: 'fitness-levels',
  hift: 'medium',
  gpp: 'medium',
  warmup: 'medium',
  stretch: 'medium',
  lastUpdated: new Date().toISOString(),
};

export async function getFitnessLevels(): Promise<OperatorFitnessLevels> {
  const row = await db.operatorFitnessLevels.get('fitness-levels');
  return row ?? DEFAULT_LEVELS;
}

export async function saveFitnessLevels(
  patch: Partial<Omit<OperatorFitnessLevels, 'id'>>
): Promise<OperatorFitnessLevels> {
  const current = await getFitnessLevels();
  const next: OperatorFitnessLevels = {
    ...current,
    ...patch,
    id: 'fitness-levels',
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorFitnessLevels.put(next);
  return next;
}

export async function setManualTier(
  category: FitnessCategory,
  tier: FitnessTier
): Promise<OperatorFitnessLevels> {
  const current = await getFitnessLevels();
  const manualOverride = { ...current.manualOverride, [category]: tier };
  return saveFitnessLevels({
    [category]: tier,
    manualOverride,
  });
}

export function tierIndex(tier: FitnessTier): number {
  return FITNESS_TIER_ORDER.indexOf(tier);
}

export function tierUp(tier: FitnessTier): FitnessTier {
  const i = tierIndex(tier);
  return FITNESS_TIER_ORDER[Math.min(i + 1, FITNESS_TIER_ORDER.length - 1)];
}

export function tierDown(tier: FitnessTier): FitnessTier {
  const i = tierIndex(tier);
  return FITNESS_TIER_ORDER[Math.max(i - 1, 0)];
}

export function effectiveTier(
  levels: OperatorFitnessLevels,
  category: FitnessCategory
): FitnessTier {
  return levels.manualOverride?.[category] ?? levels[category];
}

export function tierForWorkoutKind(
  levels: OperatorFitnessLevels,
  kind: WorkoutKind
): FitnessTier {
  const cat = fitnessCategoryForKind(kind);
  if (!cat) return 'medium';
  return effectiveTier(levels, cat);
}

function setSucceeded(log: SetLog): boolean {
  if (log.measure === 'seconds' || log.targetSeconds != null) {
    const target = log.targetSeconds ?? log.targetReps;
    const actual = log.actualSeconds ?? log.actualReps;
    return actual >= target;
  }
  return log.actualReps >= log.targetReps;
}

function kindsForCategory(category: FitnessCategory): WorkoutKind[] {
  switch (category) {
    case 'hift':
      return ['hift'];
    case 'gpp':
      return ['gpp_push', 'gpp_pull', 'gpp_core', 'gpp_legs'];
    case 'warmup':
      return ['warmup'];
    case 'stretch':
      return ['stretch'];
  }
}

export async function recomputeFitnessLevels(): Promise<OperatorFitnessLevels> {
  const levels = await getFitnessLevels();
  const since = dateKeyDaysAgo(30);
  const logs = (await db.setLogs.where('date').aboveOrEqual(since).toArray()).filter(
    (l) => l.workoutKind
  );

  const categories: FitnessCategory[] = ['hift', 'gpp', 'warmup', 'stretch'];
  const patch: Partial<OperatorFitnessLevels> = {};

  for (const category of categories) {
    const kinds = new Set(kindsForCategory(category));
    const relevant = logs.filter((l) => l.workoutKind && kinds.has(l.workoutKind));
    if (relevant.length === 0) continue;

    const byPlan = new Map<string, SetLog[]>();
    for (const l of relevant) {
      const arr = byPlan.get(l.workoutPlanId) ?? [];
      arr.push(l);
      byPlan.set(l.workoutPlanId, arr);
    }

    const sessionRates: number[] = [];
    for (const sets of byPlan.values()) {
      const ok = sets.filter(setSucceeded).length;
      sessionRates.push(ok / sets.length);
    }

    const recent = sessionRates.slice(-3);
    if (recent.length < 2) continue;

    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    let tier = effectiveTier(levels, category);
    const manual = levels.manualOverride?.[category];

    if (avg >= 0.8) {
      tier = tierUp(tier);
    } else if (avg < 0.5) {
      const down = tierDown(tier);
      tier = manual && tierIndex(down) < tierIndex(manual) ? manual : down;
    }

    patch[category] = tier;
  }

  return saveFitnessLevels(patch);
}

export function clampSets(sets: number, maxSets = 4): number {
  return Math.max(1, Math.min(maxSets, Math.round(sets)));
}

export async function suggestTargetForExercise(
  exerciseId: string,
  measure: 'reps' | 'seconds',
  fallbackReps = 8,
  fallbackSec = 30
): Promise<{ targetReps: number; targetSeconds?: number }> {
  const since = dateKeyDaysAgo(14);
  const logs = (
    await db.setLogs.where('date').aboveOrEqual(since).filter((l) => l.exerciseId === exerciseId).toArray()
  ).sort((a, b) => b.date.localeCompare(a.date));

  if (logs.length === 0) {
    return measure === 'seconds'
      ? { targetReps: fallbackSec, targetSeconds: fallbackSec }
      : { targetReps: fallbackReps };
  }

  const last = logs[0];
  if (measure === 'seconds') {
    const actual = last.actualSeconds ?? last.actualReps;
    const target = last.targetSeconds ?? last.targetReps;
    const next = setSucceeded(last) ? actual + 5 : Math.max(10, Math.floor(target * 0.9));
    return { targetReps: next, targetSeconds: next };
  }

  const actual = last.actualReps;
  const target = last.targetReps;
  const next = setSucceeded(last) ? actual + 1 : Math.max(3, Math.floor(target * 0.9));
  return { targetReps: next };
}
