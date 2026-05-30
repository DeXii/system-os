import type { ContextSliceId } from './context-slice-types';

export type ContextLoadGroup =
  | 'kernel'
  | 'schedule'
  | 'today'
  | 'compliance'
  | 'foundation'
  | 'regulation'
  | 'mind'
  | 'influence'
  | 'nutrition'
  | 'integration'
  | 'operations'
  | 'doctrine'
  | 'library'
  | 'recent';

export const ALL_LOAD_GROUPS: ContextLoadGroup[] = [
  'kernel',
  'schedule',
  'today',
  'compliance',
  'foundation',
  'regulation',
  'mind',
  'influence',
  'nutrition',
  'integration',
  'operations',
  'doctrine',
  'library',
  'recent',
];

const SLICE_TO_GROUPS: Record<ContextSliceId, ContextLoadGroup[]> = {
  meta: [],
  'operator.min': ['kernel'],
  operatorMode: ['kernel'],
  'readiness.summary': ['kernel'],
  constraints: ['kernel'],
  ruleHints: ['kernel'],
  'stageProgress.summary': ['kernel'],
  'stageProgress.gate': ['kernel', 'integration'],
  'schedule.today': ['schedule'],
  'schedule.week': ['schedule', 'foundation'],
  'today.missions': ['today'],
  'today.protocol': ['today'],
  'today.dailyLog': ['today'],
  'yesterday.pendingMissions': ['today'],
  'compliance.today': ['compliance'],
  'compliance.yesterday': ['compliance'],
  'compliance.trend': ['compliance'],
  'foundation.training': ['foundation'],
  'foundation.training.light': ['foundation'],
  'foundation.catalog': ['foundation'],
  'foundation.planToday': ['foundation'],
  'foundation.equipment': ['foundation'],
  'foundation.calibration': ['foundation'],
  'regulation.metrics': ['regulation'],
  'regulation.logs': ['regulation'],
  'regulation.directive': ['regulation'],
  'derived.regulation': ['regulation'],
  'derived.regulation.bridge': ['regulation', 'kernel'],
  'mind.cognitive': ['mind'],
  'mind.decisions': ['mind'],
  'mind.decisions.light': ['mind'],
  'influence.network': ['influence'],
  'influence.network.light': ['influence'],
  'influence.entries': ['influence'],
  'influence.directive': ['influence'],
  'nutrition.day': ['nutrition'],
  'nutrition.directive': ['nutrition'],
  'integration.weekly': ['integration'],
  'library.reading': ['library'],
  'operations.active': ['operations'],
  'doctrine.rules': ['doctrine'],
  'recent.summary': ['recent'],
};

export function loadGroupsForSlices(slices: ContextSliceId[]): Set<ContextLoadGroup> {
  const groups = new Set<ContextLoadGroup>();
  for (const slice of slices) {
    for (const g of SLICE_TO_GROUPS[slice] ?? []) {
      groups.add(g);
    }
  }
  return groups;
}

export function foundationSliceFlags(slices: ContextSliceId[]): {
  needCatalog: boolean;
  needFullTraining: boolean;
  needLightOnly: boolean;
} {
  const needCatalog = slices.some(
    (s) => s === 'foundation.catalog' || s === 'foundation.calibration'
  );
  const needFullTraining = slices.includes('foundation.training');
  const needLightOnly =
    slices.includes('foundation.training.light') && !needFullTraining;
  return { needCatalog, needFullTraining, needLightOnly: needLightOnly || needFullTraining };
}
