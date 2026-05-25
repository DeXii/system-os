import type { ExerciseMeasure, GppSubtype, PlannedExercise, WorkoutKind } from '@/core/domain/types';
import { gppKindFromSubtype } from '@/core/domain/types';
import { getCatalogExerciseById } from './index';

export interface LocalTemplateEntry {
  exerciseId: string;
  sets: number;
  targetReps: number;
  targetSeconds?: number;
  measure: ExerciseMeasure;
  restSec: number;
  repRangeLabel?: string;
}

export const LOCAL_GPP_PUSH: LocalTemplateEntry[] = [
  { exerciseId: 'gpp_push_floor', sets: 3, targetReps: 12, measure: 'reps', restSec: 90, repRangeLabel: '10–15' },
  { exerciseId: 'gpp_push_dip', sets: 3, targetReps: 10, measure: 'reps', restSec: 90, repRangeLabel: '8–12' },
  { exerciseId: 'gpp_push_pike', sets: 3, targetReps: 10, measure: 'reps', restSec: 90, repRangeLabel: '8–12' },
  { exerciseId: 'gpp_push_diamond', sets: 3, targetReps: 10, measure: 'reps', restSec: 90, repRangeLabel: '8–12' },
  { exerciseId: 'gpp_push_tempo', sets: 3, targetReps: 9, measure: 'reps', restSec: 90, repRangeLabel: '8–10' },
  { exerciseId: 'gpp_core_lsit_tuck', sets: 3, targetReps: 20, targetSeconds: 20, measure: 'seconds', restSec: 60, repRangeLabel: '15–25 сек' },
  { exerciseId: 'gpp_push_plank_hold', sets: 3, targetReps: 50, targetSeconds: 50, measure: 'seconds', restSec: 60, repRangeLabel: '45–60 сек' },
];

export const LOCAL_GPP_PULL: LocalTemplateEntry[] = [
  { exerciseId: 'gpp_pull_australian', sets: 3, targetReps: 12, measure: 'reps', restSec: 60, repRangeLabel: '10–15' },
  { exerciseId: 'gpp_pull_neutral', sets: 4, targetReps: 6, measure: 'reps', restSec: 90, repRangeLabel: '5–8' },
  { exerciseId: 'gpp_pull_wide', sets: 4, targetReps: 6, measure: 'reps', restSec: 90, repRangeLabel: '5–8' },
  { exerciseId: 'gpp_pull_chin', sets: 3, targetReps: 8, measure: 'reps', restSec: 90, repRangeLabel: '6–10' },
  { exerciseId: 'gpp_pull_active_hang', sets: 3, targetReps: 25, targetSeconds: 25, measure: 'seconds', restSec: 60, repRangeLabel: '20–30 сек' },
  { exerciseId: 'gpp_core_leg_raise', sets: 3, targetReps: 10, measure: 'reps', restSec: 90, repRangeLabel: '8–12' },
  { exerciseId: 'gpp_pull_scap', sets: 3, targetReps: 12, measure: 'reps', restSec: 60, repRangeLabel: '10–15' },
];

export const LOCAL_GPP_LEGS_CORE: LocalTemplateEntry[] = [
  { exerciseId: 'gpp_legs_squat_pause', sets: 4, targetReps: 13, measure: 'reps', restSec: 60, repRangeLabel: '12–15' },
  { exerciseId: 'gpp_legs_lunge', sets: 3, targetReps: 10, measure: 'reps', restSec: 60, repRangeLabel: '10 на ногу' },
  { exerciseId: 'gpp_legs_bulgarian', sets: 3, targetReps: 9, measure: 'reps', restSec: 90, repRangeLabel: '8–10 на ногу' },
  { exerciseId: 'gpp_legs_pistol_assist', sets: 3, targetReps: 6, measure: 'reps', restSec: 90, repRangeLabel: '5–8 на ногу' },
  { exerciseId: 'gpp_core_leg_raise', sets: 3, targetReps: 11, measure: 'reps', restSec: 90, repRangeLabel: '10–12' },
  { exerciseId: 'gpp_legs_single_calf', sets: 4, targetReps: 13, measure: 'reps', restSec: 60, repRangeLabel: '12–15 на ногу' },
  { exerciseId: 'gpp_legs_burpee', sets: 3, targetReps: 9, measure: 'reps', restSec: 90, repRangeLabel: '8–10' },
];

export const LOCAL_HIFT: LocalTemplateEntry[] = [
  { exerciseId: 'hift_pullup', sets: 1, targetReps: 5, measure: 'reps', restSec: 0 },
  { exerciseId: 'hift_dip', sets: 1, targetReps: 8, measure: 'reps', restSec: 0 },
  { exerciseId: 'hift_jump_squat', sets: 1, targetReps: 10, measure: 'reps', restSec: 0 },
  { exerciseId: 'hift_pushup', sets: 1, targetReps: 10, measure: 'reps', restSec: 0 },
  { exerciseId: 'hift_knee_raise', sets: 1, targetReps: 8, measure: 'reps', restSec: 0 },
];

export function getLocalTemplate(subtype: GppSubtype): LocalTemplateEntry[] {
  switch (subtype) {
    case 'push':
      return LOCAL_GPP_PUSH;
    case 'pull':
      return LOCAL_GPP_PULL;
    case 'core':
    case 'legs':
      return LOCAL_GPP_LEGS_CORE;
  }
}

export function buildPlannedFromTemplate(entries: LocalTemplateEntry[]): PlannedExercise[] {
  return entries.map((e) => ({
    exerciseId: e.exerciseId,
    sets: e.sets,
    targetReps: e.targetReps,
    targetSeconds: e.measure === 'seconds' ? (e.targetSeconds ?? e.targetReps) : undefined,
    measure: e.measure,
    restSec: e.restSec,
  }));
}

export function templateNotesLabel(entries: LocalTemplateEntry[]): string {
  return entries
    .map((e, i) => {
      const name = getCatalogExerciseById(e.exerciseId)?.name ?? e.exerciseId;
      const target =
        e.measure === 'seconds'
          ? `${e.targetSeconds ?? e.targetReps}с (${e.repRangeLabel ?? ''})`
          : `${e.targetReps} (${e.repRangeLabel ?? ''})`;
      return `${i + 1}. ${name}: ${e.sets}×${target}, отдых ${e.restSec}с`;
    })
    .join(' · ');
}

export type ReferenceTemplateKey = 'hift' | 'gpp_push' | 'gpp_pull' | 'gpp_legs' | 'gpp_core';

export function formatTemplateForGroq(key: ReferenceTemplateKey): {
  structure: string;
  rounds?: number;
  roundRestSec?: number;
  exercises: Array<{
    order: number;
    exerciseId: string;
    name: string;
    sets: number;
    target: string;
    restSec: number;
    measure: ExerciseMeasure;
  }>;
} {
  const entries =
    key === 'hift'
      ? LOCAL_HIFT
      : key === 'gpp_push'
        ? LOCAL_GPP_PUSH
        : key === 'gpp_pull'
          ? LOCAL_GPP_PULL
          : LOCAL_GPP_LEGS_CORE;

  const isHift = key === 'hift';
  return {
    structure: isHift ? 'circuit' : 'straight_sets',
    rounds: isHift ? 3 : undefined,
    roundRestSec: isHift ? 120 : undefined,
    exercises: entries.map((e, i) => {
      const meta = getCatalogExerciseById(e.exerciseId);
      const target =
        e.measure === 'seconds'
          ? `${e.targetSeconds ?? e.targetReps} сек${e.repRangeLabel ? ` (${e.repRangeLabel})` : ''}`
          : `${e.targetReps} повт${e.repRangeLabel ? ` (${e.repRangeLabel})` : ''}`;
      return {
        order: i + 1,
        exerciseId: e.exerciseId,
        name: meta?.name ?? e.exerciseId,
        sets: e.sets,
        target,
        restSec: e.restSec,
        measure: e.measure,
      };
    }),
  };
}

export function getAllReferenceTemplatesForGroq(): Record<
  ReferenceTemplateKey,
  ReturnType<typeof formatTemplateForGroq>
> {
  return {
    hift: formatTemplateForGroq('hift'),
    gpp_push: formatTemplateForGroq('gpp_push'),
    gpp_pull: formatTemplateForGroq('gpp_pull'),
    gpp_legs: formatTemplateForGroq('gpp_legs'),
    gpp_core: formatTemplateForGroq('gpp_core'),
  };
}

export function localTemplateKindForGpp(subtype: GppSubtype): WorkoutKind {
  return gppKindFromSubtype(subtype);
}
