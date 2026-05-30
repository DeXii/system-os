import type { TaskId } from '../../director-tasks';
import type { ContextSliceId } from '../../context/context-slice-types';
import { getContextManifest } from './context-manifest';

/** JSON dot-paths each slice must contribute when present in manifest */
export const SLICE_REQUIRED_PATHS: Record<ContextSliceId, string[]> = {
  meta: ['date', 'contextLookbackDays', 'contextSinceDate', 'taskId'],
  'operator.min': ['fact.operator'],
  operatorMode: ['fact.operatorMode'],
  'schedule.today': ['fact.schedule.todayQueue'],
  'schedule.week': ['fact.schedule.weekTemplateDays'],
  'today.missions': ['fact.today.missions'],
  'today.protocol': ['fact.today.protocol'],
  'today.dailyLog': ['fact.today.dailyLog'],
  'yesterday.pendingMissions': ['fact.yesterdayPendingMissions'],
  'compliance.today': ['fact.compliance.today'],
  'compliance.yesterday': ['fact.compliance.yesterday'],
  'compliance.trend': ['fact.compliance.trendInWindow'],
  'readiness.summary': ['derived.readiness', 'derived.moduleStatuses'],
  'stageProgress.summary': ['derived.stageProgress'],
  'stageProgress.gate': ['derived.stageProgress.failedBlockers', 'derived.stageProgress.lastGateSnapshot'],
  constraints: ['hints.constraints', 'hints.aiMode'],
  ruleHints: ['hints.ruleHints'],
  'foundation.training.light': ['fact.foundation'],
  'foundation.catalog': [
    'fact.foundation.allowedExerciseIds',
    'fact.foundation.exerciseCatalog',
    'fact.foundation.referenceWorkoutTemplates',
  ],
  'foundation.training': ['fact.foundation', 'fact.foundation.cardioSessionsInWindow'],
  'foundation.planToday': ['fact.foundation.workoutPlanToday'],
  'foundation.equipment': ['fact.foundation.equipmentConstraints'],
  'foundation.calibration': ['fact.foundation.calibration'],
  'regulation.metrics': ['fact.regulation'],
  'regulation.logs': ['fact.regulation'],
  'regulation.directive': ['fact.regulation.regulationDirective'],
  'derived.regulation': ['derived.regulation'],
  'derived.regulation.bridge': ['derived.regulation'],
  'mind.cognitive': ['fact.mind.mindDirective'],
  'mind.decisions': ['fact.mind.recentDecisions'],
  'mind.decisions.light': ['fact.mind.pendingDecisionFollowUps'],
  'influence.network': ['fact.influence.contacts'],
  'influence.network.light': ['fact.influence.contacts'],
  'influence.entries': ['fact.influence.recentEntries'],
  'influence.directive': ['fact.influence.influenceDirective'],
  'nutrition.day': ['fact.nutrition'],
  'nutrition.directive': ['fact.nutrition.nutritionDirective'],
  'integration.weekly': [
    'derived.integration.integrationDirective',
    'derived.integration.stages',
    'derived.integration.synergy',
    'derived.integration.ops7d',
  ],
  'library.reading': ['fact.readingProgress'],
  'operations.active': ['fact.operations.active'],
  'doctrine.rules': ['fact.doctrine.rules'],
  'recent.summary': ['fact.recent'],
};

/** Extra paths per task (template / action driven) */
export const TASK_EXTRA_REQUIRED_PATHS: Partial<Record<TaskId, string[]>> = {
  planHift: ['fact.foundation.referenceWorkoutTemplates'],
  planGpp: ['fact.foundation.referenceWorkoutTemplates'],
  planWarmup: ['fact.foundation.referenceWorkoutTemplates'],
  planStretch: ['fact.foundation.referenceWorkoutTemplates'],
  planWorkout: ['fact.foundation.referenceWorkoutTemplates'],
  planCardioIntense: ['fact.foundation.cardioSessionsInWindow'],
  planCardioEasy: ['fact.foundation.cardioSessionsInWindow'],
  mindCoach: ['fact.schedule.todayQueue'],
  regulationCoach: ['fact.regulation.regulationDirective', 'fact.schedule.todayQueue'],
  stageGateReview: ['derived.stageProgress.failedBlockers'],
};

export function pathsForManifestSlices(slices: ContextSliceId[]): string[] {
  const paths = new Set<string>();
  for (const slice of slices) {
    for (const p of SLICE_REQUIRED_PATHS[slice] ?? []) {
      paths.add(p);
    }
  }
  return [...paths];
}

export function requiredPathsForTask(taskId: TaskId): string[] {
  const manifest = getContextManifest(taskId);
  const paths = new Set(pathsForManifestSlices(manifest.slices));
  for (const p of TASK_EXTRA_REQUIRED_PATHS[taskId] ?? []) {
    paths.add(p);
  }
  return [...paths];
}

export function hasPath(root: unknown, path: string): boolean {
  const parts = path.split('.');
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur !== undefined && cur !== null;
}

export function assertPayloadCoversTask(
  taskId: TaskId,
  payload: unknown
): { ok: true } | { ok: false; missing: string[] } {
  const required = requiredPathsForTask(taskId);
  const missing = required.filter((p) => !hasPath(payload, p));
  if (missing.length === 0) return { ok: true };
  return { ok: false, missing };
}

export function assertManifestSlicesKnown(slices: ContextSliceId[]): string[] {
  return slices.filter((s) => !SLICE_REQUIRED_PATHS[s]);
}
