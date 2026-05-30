import type { TaskId } from '../../director-tasks';
import type { ContextLookbackDays } from '../../context-builder';
import type { ContextManifest, ContextSliceId } from '../../context/context-slice-types';
import { FULL_CONTEXT_SLICES } from '../../context/context-slice-types';

const K: ContextSliceId[] = [
  'meta',
  'operator.min',
  'operatorMode',
  'readiness.summary',
  'constraints',
  'ruleHints',
];

const SCHEDULE_TODAY: ContextSliceId[] = ['schedule.today'];
const TODAY_ALL: ContextSliceId[] = ['today.missions', 'today.protocol', 'today.dailyLog'];
const COMPLIANCE_ALL: ContextSliceId[] = [
  'compliance.today',
  'compliance.yesterday',
  'compliance.trend',
];
const FOUNDATION_PLAN: ContextSliceId[] = ['foundation.planToday', 'foundation.equipment'];
const FOUNDATION_TRAIN: ContextSliceId[] = ['foundation.training'];
const FOUNDATION_TRAIN_LIGHT: ContextSliceId[] = ['foundation.training.light'];
const FOUNDATION_CATALOG: ContextSliceId[] = ['foundation.catalog', 'foundation.calibration'];
const REGULATION_CORE: ContextSliceId[] = [
  'regulation.metrics',
  'regulation.logs',
  'regulation.directive',
  'derived.regulation',
];
const REG_BRIDGE: ContextSliceId[] = ['derived.regulation.bridge'];
const MIND_COG: ContextSliceId[] = ['mind.cognitive'];
const MIND_DEC: ContextSliceId[] = ['mind.decisions'];
const MIND_DEC_LIGHT: ContextSliceId[] = ['mind.decisions.light'];
const INFLUENCE_NET: ContextSliceId[] = ['influence.network', 'influence.directive'];
const INFLUENCE_NET_LIGHT: ContextSliceId[] = ['influence.network.light'];
const INFLUENCE_ENTRIES: ContextSliceId[] = ['influence.entries'];
const NUTRITION_ALL: ContextSliceId[] = ['nutrition.day', 'nutrition.directive'];
const INTEGRATION_WEEKLY: ContextSliceId[] = ['integration.weekly'];
const STAGE_GATE: ContextSliceId[] = ['stageProgress.gate'];

function m(slices: ContextSliceId[], lookbackDays?: ContextManifest['lookbackDays']): ContextManifest {
  return { mode: 'minimal', slices: [...new Set(slices)], lookbackDays };
}

export const TASK_CONTEXT_MANIFESTS: Record<TaskId, ContextManifest> = {
  morningBriefing: m([
    ...K,
    ...SCHEDULE_TODAY,
    ...TODAY_ALL,
    ...COMPLIANCE_ALL,
    'yesterday.pendingMissions',
    ...FOUNDATION_PLAN,
    ...FOUNDATION_TRAIN_LIGHT,
    ...REGULATION_CORE,
  ]),
  eveningDebrief: m([
    ...K,
    ...TODAY_ALL,
    'compliance.today',
    'compliance.yesterday',
    'yesterday.pendingMissions',
  ]),
  weeklyAudit: m([
    ...K,
    ...COMPLIANCE_ALL,
    ...INTEGRATION_WEEKLY,
    ...STAGE_GATE,
  ]),
  deepAnalysis14d: { mode: 'full', slices: FULL_CONTEXT_SLICES, lookbackDays: 14 },
  deepAnalysis30d: { mode: 'full', slices: FULL_CONTEXT_SLICES, lookbackDays: 30 },
  pdpReview: m([...K, ...INTEGRATION_WEEKLY]),
  stageGateReview: m([...K, ...INTEGRATION_WEEKLY, ...STAGE_GATE]),
  foundationCoach: m([...K, ...FOUNDATION_PLAN, ...FOUNDATION_TRAIN, ...REG_BRIDGE]),
  planWorkout: m([...K, ...FOUNDATION_CATALOG, ...FOUNDATION_TRAIN, ...FOUNDATION_PLAN]),
  planHift: m([...K, ...FOUNDATION_CATALOG, ...FOUNDATION_TRAIN, ...FOUNDATION_PLAN]),
  planGpp: m([...K, ...FOUNDATION_CATALOG, ...FOUNDATION_TRAIN, ...FOUNDATION_PLAN]),
  planWarmup: m([...K, ...FOUNDATION_CATALOG, ...FOUNDATION_TRAIN, ...FOUNDATION_PLAN]),
  planStretch: m([...K, ...FOUNDATION_CATALOG, ...FOUNDATION_TRAIN, ...FOUNDATION_PLAN]),
  planCardioIntense: m([...K, ...FOUNDATION_TRAIN, ...REG_BRIDGE]),
  planCardioEasy: m([...K, ...FOUNDATION_TRAIN, ...REG_BRIDGE]),
  nutritionCoach: m([...K, ...NUTRITION_ALL]),
  regulationCoach: m([
    ...K,
    ...SCHEDULE_TODAY,
    'today.protocol',
    ...REGULATION_CORE,
    'foundation.equipment',
  ]),
  mindCoach: m([
    ...K,
    ...SCHEDULE_TODAY,
    'today.protocol',
    ...MIND_COG,
    ...MIND_DEC_LIGHT,
  ]),
  influenceCoach: m([...K, ...INFLUENCE_NET, ...INFLUENCE_ENTRIES]),
  libraryCoach: m(['meta', 'operator.min', 'library.reading']),
  freeCommand: { mode: 'full', slices: FULL_CONTEXT_SLICES },
  rescheduleDay: m([...K, ...SCHEDULE_TODAY, 'today.protocol', 'constraints']),
  buildWeekSchedule: m([
    ...K,
    ...SCHEDULE_TODAY,
    'schedule.week',
    'foundation.equipment',
    'foundation.training.light',
    'readiness.summary',
    'constraints',
  ]),
  tacticalDebrief: m([...K, ...MIND_COG, ...MIND_DEC]),
  contactBrief: m([...K, ...INFLUENCE_NET]),
  preContactSimulation: m([...K, ...INFLUENCE_NET]),
  operationReview: m([...K, 'operations.active', ...INFLUENCE_NET_LIGHT]),
  decisionFollowUp: m([...K, ...MIND_COG, ...MIND_DEC]),
  doctrineReview: m([
    ...K,
    'doctrine.rules',
    'compliance.trend',
    'today.missions',
    'today.protocol',
  ]),
};

export function getContextManifest(taskId: TaskId): ContextManifest {
  return TASK_CONTEXT_MANIFESTS[taskId];
}

export function resolveManifestLookback(
  taskId: TaskId,
  explicit?: ContextManifest['lookbackDays']
): ContextLookbackDays {
  if (explicit) return explicit;
  const manifest = getContextManifest(taskId);
  if (manifest.lookbackDays) return manifest.lookbackDays;
  if (taskId === 'deepAnalysis14d') return 14;
  if (taskId === 'deepAnalysis30d') return 30;
  return 7;
}
