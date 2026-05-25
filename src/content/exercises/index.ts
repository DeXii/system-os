import type {
  CatalogExercise,
  FitnessCategory,
  FitnessTier,
  GppSubtype,
  WorkoutKind,
} from '@/core/domain/types';
import { gppKindFromSubtype } from '@/core/domain/types';
import { BAR_EXERCISES } from '@/content/exercises-bars';
import { HIFT_EXERCISES } from './exercises-hift';
import { GPP_PUSH_EXERCISES } from './exercises-gpp-push';
import { GPP_PULL_EXERCISES } from './exercises-gpp-pull';
import { GPP_CORE_EXERCISES } from './exercises-gpp-core';
import { GPP_LEGS_EXERCISES } from './exercises-gpp-legs';
import { WARMUP_EXERCISES } from './exercises-warmup';
import { STRETCH_EXERCISES } from './exercises-stretch';

const LEGACY_CATALOG: CatalogExercise[] = BAR_EXERCISES.map((e) => ({
  ...e,
  workoutKinds: ['legacy'] as WorkoutKind[],
  tiers: ['beginner', 'novice', 'medium', 'pro', 'ayanakoji'] as FitnessTier[],
  measure: e.progressionRule.includes('time') || e.id === 'plank' ? 'seconds' : 'reps',
  isStatic: e.id === 'plank' || e.progressionRule.includes('time'),
}));

export const ALL_CATALOG_EXERCISES: CatalogExercise[] = [
  ...LEGACY_CATALOG,
  ...HIFT_EXERCISES,
  ...GPP_PUSH_EXERCISES,
  ...GPP_PULL_EXERCISES,
  ...GPP_CORE_EXERCISES,
  ...GPP_LEGS_EXERCISES,
  ...WARMUP_EXERCISES,
  ...STRETCH_EXERCISES,
];

const BY_ID = new Map(ALL_CATALOG_EXERCISES.map((e) => [e.id, e]));

export function getCatalogExerciseById(id: string): CatalogExercise | undefined {
  return BY_ID.get(id);
}

export function getExercisesForKind(kind: WorkoutKind, tier: FitnessTier): CatalogExercise[] {
  return ALL_CATALOG_EXERCISES.filter(
    (e) => e.workoutKinds.includes(kind) && e.tiers.includes(tier)
  );
}

export function getAllowedIdsForKind(kind: WorkoutKind, tier: FitnessTier): string[] {
  return getExercisesForKind(kind, tier).map((e) => e.id);
}

export function fitnessCategoryForKind(kind: WorkoutKind): FitnessCategory | null {
  if (kind === 'hift') return 'hift';
  if (kind.startsWith('gpp_')) return 'gpp';
  if (kind === 'warmup') return 'warmup';
  if (kind === 'stretch') return 'stretch';
  return null;
}

export function gppExercisesForSubtype(sub: GppSubtype, tier: FitnessTier): CatalogExercise[] {
  return getExercisesForKind(gppKindFromSubtype(sub), tier);
}

/** @deprecated use getCatalogExerciseById */
export { getExerciseById } from '@/content/exercises-bars';
