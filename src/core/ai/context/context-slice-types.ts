import type { TaskId } from '../director-tasks';
import type { ContextLookbackDays } from '../context-builder';
import type { WorkoutContextOptions } from '../context-builder';

export const CONTEXT_SLICE_IDS = [
  'meta',
  'operator.min',
  'operatorMode',
  'schedule.today',
  'schedule.week',
  'today.missions',
  'today.protocol',
  'today.dailyLog',
  'yesterday.pendingMissions',
  'compliance.today',
  'compliance.yesterday',
  'compliance.trend',
  'readiness.summary',
  'stageProgress.summary',
  'stageProgress.gate',
  'constraints',
  'ruleHints',
  'foundation.training',
  'foundation.training.light',
  'foundation.catalog',
  'foundation.planToday',
  'foundation.equipment',
  'foundation.calibration',
  'regulation.metrics',
  'regulation.logs',
  'regulation.directive',
  'derived.regulation',
  'derived.regulation.bridge',
  'mind.cognitive',
  'mind.decisions',
  'mind.decisions.light',
  'influence.network',
  'influence.network.light',
  'influence.entries',
  'influence.directive',
  'nutrition.day',
  'nutrition.directive',
  'integration.weekly',
  'library.reading',
  'operations.active',
  'doctrine.rules',
  'recent.summary',
] as const;

export type ContextSliceId = (typeof CONTEXT_SLICE_IDS)[number];

export interface ContextManifest {
  mode: 'full' | 'minimal';
  slices: ContextSliceId[];
  lookbackDays?: ContextLookbackDays;
}

export interface BuildDirectorContextOptions {
  scope?: string;
  lookbackDays?: ContextLookbackDays;
  workoutContext?: WorkoutContextOptions;
}

export interface DirectorLayeredPayload {
  date: string;
  contextLookbackDays: ContextLookbackDays;
  contextSinceDate: string;
  scope: string;
  taskId: TaskId;
  fact: Record<string, unknown>;
  derived: Record<string, unknown>;
  hints: Record<string, unknown>;
}

export const FULL_CONTEXT_SLICES: ContextSliceId[] = [...CONTEXT_SLICE_IDS];
