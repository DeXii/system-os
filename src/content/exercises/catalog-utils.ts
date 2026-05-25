import type {
  BarEquipment,
  CatalogExercise,
  ExerciseMeasure,
  ExercisePattern,
  FitnessTier,
  WorkoutKind,
} from '@/core/domain/types';

type ExDef = {
  id: string;
  name: string;
  pattern: ExercisePattern;
  equipment: BarEquipment;
  muscles: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  defaultRestSec: number;
  progressionRule: string;
  workoutKinds: WorkoutKind[];
  tiers: FitnessTier[];
  measure: ExerciseMeasure;
  isStatic?: boolean;
  defaultTargetReps?: number;
  defaultTargetSec?: number;
};

export function defineExercise(d: ExDef): CatalogExercise {
  return { ...d };
}

export function tiersFromMin(min: FitnessTier): FitnessTier[] {
  const order: FitnessTier[] = ['beginner', 'novice', 'medium', 'pro', 'ayanakoji'];
  const i = order.indexOf(min);
  return order.slice(i >= 0 ? i : 2);
}

export function allTiers(): FitnessTier[] {
  return ['beginner', 'novice', 'medium', 'pro', 'ayanakoji'];
}
