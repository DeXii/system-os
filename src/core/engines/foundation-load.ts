import { db, todayKey } from '../db';
import type { PlannedExercise } from '../domain/types';
import { getHrvBaseline14d, isHrvBelowBaseline } from './regulation-metrics';
import { getTrainingParams } from './training-params';
import { clampSets } from './progression-engine';

export interface FoundationLoadModifiers {
  volumeMultiplier: number;
  deload: boolean;
  hrvBelowBaseline: boolean;
  reason?: string;
}

export async function getFoundationLoadModifiers(): Promise<FoundationLoadModifiers> {
  const baseline = await getHrvBaseline14d();
  const todayEntry = await db.hrvEntries.where('date').equals(todayKey()).first();
  let volumeMultiplier = 1;
  let deload = false;
  let hrvBelowBaseline = false;
  const reasons: string[] = [];

  if (baseline != null && todayEntry && (await isHrvBelowBaseline(todayEntry))) {
    hrvBelowBaseline = true;
    volumeMultiplier = 0.85;
    deload = true;
    reasons.push(`HRV ${todayEntry.rmssd} < baseline ${baseline}`);
  }

  const params = await getTrainingParams();
  if (params.fatigue > 0.65) {
    volumeMultiplier = Math.min(volumeMultiplier, 1 - 0.35 * params.fatigue);
    deload = true;
    reasons.push(`fatigue=${params.fatigue.toFixed(2)}`);
  }

  if (params.recoveryPrior < 0.45) {
    volumeMultiplier = Math.min(volumeMultiplier, 0.9);
    deload = true;
    reasons.push(`recovery=${params.recoveryPrior.toFixed(2)}`);
  }

  return {
    volumeMultiplier: Math.max(0.65, volumeMultiplier),
    deload,
    hrvBelowBaseline,
    reason: reasons.length ? reasons.join('; ') : undefined,
  };
}

export function applyLoadCapToPlanned(
  exercises: PlannedExercise[],
  multiplier: number
): PlannedExercise[] {
  if (multiplier >= 0.99) return exercises;
  return exercises.map((e) => ({
    ...e,
    sets: clampSets(Math.max(1, Math.round(e.sets * multiplier))),
    targetReps:
      e.measure !== 'seconds'
        ? Math.max(3, Math.round(e.targetReps * (multiplier < 0.9 ? multiplier : 1)))
        : e.targetReps,
    targetSeconds:
      e.measure === 'seconds' && e.targetSeconds != null
        ? Math.max(10, Math.round(e.targetSeconds * multiplier))
        : e.targetSeconds,
  }));
}
