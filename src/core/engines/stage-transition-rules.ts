import type {
  DemotionEvaluation,
  OperatorProfile,
  ReadinessHistoryEntry,
  ReadinessScores,
  StageGateCriterion,
  StageGateEvaluation,
  StageId,
} from '../domain/types';
import { nextStage, STAGE_ORDER } from '../domain/types';
import { shouldThrottleCognitiveLoad } from './mind-metrics';

export const QUALIFYING_DAYS_REQUIRED = 10;
export const SOFT_SCORE_REQUIRED = 80;
export const READINESS_HISTORY_DAYS = 14;

export interface StageGateContext {
  profile: OperatorProfile;
  readiness: ReadinessScores;
  complianceAvg7d: number;
  debriefRate7d: number;
  briefingRate7d: number;
  regulationStreak: number;
  resonantBreath7d: number;
  hrvDays7d: number;
  mindStreak: number;
  scenarios14d: number;
  decisions14d: number;
  cognitiveThrottle: boolean;
  bftDaysSince: number | null;
  trainingSessions7d: number;
  miCount14d: number;
  readinessHistory: ReadinessHistoryEntry[];
}

function criterion(
  id: string,
  label: string,
  met: boolean,
  current: string | number,
  target: string,
  severity: 'blocker' | 'soft',
  weight = 10
): StageGateCriterion {
  return {
    id,
    label,
    met,
    current: String(current),
    target,
    weight,
    severity,
  };
}

function countHistoryWhere(
  history: ReadinessHistoryEntry[],
  days: number,
  predicate: (e: ReadinessHistoryEntry) => boolean
): number {
  const slice = history.slice(-days);
  return slice.filter(predicate).length;
}

function computeSoftScore(criteria: StageGateCriterion[]): number {
  const soft = criteria.filter((c) => c.severity === 'soft');
  if (soft.length === 0) return 100;
  const totalWeight = soft.reduce((a, c) => a + c.weight, 0);
  const metWeight = soft.filter((c) => c.met).reduce((a, c) => a + c.weight, 0);
  return Math.round((metWeight / totalWeight) * 100);
}

function evaluateFoundationToRegulation(ctx: StageGateContext): StageGateCriterion[] {
  const { readiness, complianceAvg7d, debriefRate7d, briefingRate7d, bftDaysSince, trainingSessions7d, readinessHistory } =
    ctx;
  const bftOk = bftDaysSince != null && bftDaysSince <= 90;
  const trainingOk = trainingSessions7d >= 2;
  const foundationDays65 = countHistoryWhere(readinessHistory, 14, (e) => e.foundation >= 65);

  return [
    criterion('foundation_score', 'Readiness FOUNDATION', readiness.foundation >= 68, readiness.foundation, '≥68', 'blocker'),
    criterion('global_score', 'Global readiness', readiness.global >= 58, readiness.global, '≥58', 'blocker'),
    criterion('compliance_7d', 'Compliance 7д', complianceAvg7d >= 62, complianceAvg7d, '≥62%', 'blocker'),
    criterion('debrief_7d', 'Debrief rate 7д', debriefRate7d >= 75, debriefRate7d, '≥75%', 'blocker'),
    criterion(
      'bft_or_training',
      'BFT ≤90д или ≥2 тренировки/7д',
      bftOk || trainingOk,
      bftOk ? `BFT ${bftDaysSince}д` : `${trainingSessions7d} трен.`,
      'BFT≤90д | ≥2 трен.',
      'blocker'
    ),
    criterion(
      'foundation_days_14',
      '10/14 дней foundation≥65',
      foundationDays65 >= 10,
      `${foundationDays65}/14`,
      '≥10/14',
      'soft',
      15
    ),
    criterion('briefing_7d', 'Briefing rate 7д', briefingRate7d >= 50, briefingRate7d, '≥50%', 'soft', 10),
  ];
}

function evaluateRegulationToMind(ctx: StageGateContext): StageGateCriterion[] {
  const {
    readiness,
    complianceAvg7d,
    debriefRate7d,
    regulationStreak,
    resonantBreath7d,
    hrvDays7d,
    readinessHistory,
  } = ctx;
  const regulationStreak14 = countHistoryWhere(
    readinessHistory,
    14,
    (e) => e.regulation >= 60 && e.foundation >= 50
  );

  return [
    criterion('foundation_floor', 'FOUNDATION (база)', readiness.foundation >= 52, readiness.foundation, '≥52', 'blocker'),
    criterion('regulation_score', 'Readiness REGULATION', readiness.regulation >= 70, readiness.regulation, '≥70', 'blocker'),
    criterion('global_score', 'Global readiness', readiness.global >= 62, readiness.global, '≥62', 'blocker'),
    criterion(
      'regulation_practice',
      'Regulation practice 14д',
      regulationStreak14 >= 4 || regulationStreak >= 4,
      Math.max(regulationStreak14, regulationStreak),
      '≥4/14',
      'blocker'
    ),
    criterion('hrv_7d', 'HRV записей 7д', hrvDays7d >= 3, hrvDays7d, '≥3', 'blocker'),
    criterion('debrief_7d', 'Debrief rate 7д', debriefRate7d >= 80, debriefRate7d, '≥80%', 'blocker'),
    criterion('resonant_7d', 'Резонансное дыхание 7д', resonantBreath7d >= 2, resonantBreath7d, '≥2', 'soft', 12),
    criterion('compliance_7d', 'Compliance 7д', complianceAvg7d >= 65, complianceAvg7d, '≥65%', 'soft', 10),
  ];
}

function evaluateMindToInfluence(ctx: StageGateContext): StageGateCriterion[] {
  const {
    readiness,
    complianceAvg7d,
    mindStreak,
    scenarios14d,
    decisions14d,
    cognitiveThrottle,
    readinessHistory,
  } = ctx;
  const mindStreak14 = countHistoryWhere(
    readinessHistory,
    14,
    (e) => e.mind >= 55 && e.foundation >= 48 && e.regulation >= 50
  );

  return [
    criterion('foundation_floor', 'FOUNDATION (база)', readiness.foundation >= 48, readiness.foundation, '≥48', 'blocker'),
    criterion('regulation_floor', 'REGULATION (база)', readiness.regulation >= 50, readiness.regulation, '≥50', 'blocker'),
    criterion('mind_score', 'Readiness MIND', readiness.mind >= 68, readiness.mind, '≥68', 'blocker'),
    criterion('global_score', 'Global readiness', readiness.global >= 65, readiness.global, '≥65', 'blocker'),
    criterion(
      'mind_practice',
      'Mind practice 14д',
      mindStreak14 >= 3 || mindStreak >= 3,
      Math.max(mindStreak14, mindStreak),
      '≥3/14',
      'blocker'
    ),
    criterion('scenarios_14d', 'SWOT/сценарии 14д', scenarios14d >= 1, scenarios14d, '≥1', 'blocker'),
    criterion(
      'cognitive_throttle',
      'Когнитивная нагрузка',
      !cognitiveThrottle,
      cognitiveThrottle ? 'throttle ON' : 'OK',
      'без throttle',
      'blocker'
    ),
    criterion('compliance_7d', 'Compliance 7д', complianceAvg7d >= 70, complianceAvg7d, '≥70%', 'soft', 12),
    criterion('decisions_14d', 'Decision log 14д', decisions14d >= 1, decisions14d, '≥1', 'soft', 8),
  ];
}

function getCriteriaForTransition(from: StageId, ctx: StageGateContext): StageGateCriterion[] {
  switch (from) {
    case 'foundation':
      return evaluateFoundationToRegulation(ctx);
    case 'regulation':
      return evaluateRegulationToMind(ctx);
    case 'mind':
      return evaluateMindToInfluence(ctx);
    default:
      return [];
  }
}

export function isTodayQualifying(criteria: StageGateCriterion[], softScore: number): boolean {
  const blockers = criteria.filter((c) => c.severity === 'blocker');
  return blockers.every((c) => c.met) && softScore >= SOFT_SCORE_REQUIRED;
}

export function evaluateTransitionGates(ctx: StageGateContext): StageGateEvaluation {
  const fromStage = ctx.profile.currentStage;
  const toStage = nextStage(fromStage);
  const criteria = toStage ? getCriteriaForTransition(fromStage, ctx) : [];
  const blockers = criteria.filter((c) => c.severity === 'blocker');
  const blockersMet = blockers.length === 0 || blockers.every((c) => c.met);
  const softScore = computeSoftScore(criteria);
  const qualifyingDays = countQualifyingDaysFromHistory(ctx.readinessHistory);

  const reasons: string[] = [];
  if (!blockersMet) {
    reasons.push(...blockers.filter((c) => !c.met).map((c) => c.label));
  }
  if (softScore < SOFT_SCORE_REQUIRED) {
    reasons.push(`Soft score ${softScore}% < ${SOFT_SCORE_REQUIRED}%`);
  }
  if (qualifyingDays < QUALIFYING_DAYS_REQUIRED) {
    reasons.push(`Qualifying days ${qualifyingDays}/${QUALIFYING_DAYS_REQUIRED}`);
  }

  const eligible =
    toStage != null &&
    blockersMet &&
    softScore >= SOFT_SCORE_REQUIRED &&
    qualifyingDays >= QUALIFYING_DAYS_REQUIRED;

  return {
    fromStage,
    toStage,
    criteria,
    blockersMet,
    softScore,
    eligible,
    qualifyingDays,
    qualifyingRequired: QUALIFYING_DAYS_REQUIRED,
    reasons,
    evaluatedAt: new Date().toISOString(),
  };
}

/** Count days in history marked qualified at daily evaluation. */
function countQualifyingDaysFromHistory(history: ReadinessHistoryEntry[]): number {
  return history.filter((e) => e.qualified).length;
}

export function evaluateDemotionRisk(ctx: StageGateContext): DemotionEvaluation {
  const stage = ctx.profile.currentStage;
  const history = ctx.readinessHistory;
  const criteria: DemotionEvaluation['criteria'] = [];
  const reasons: string[] = [];

  if (stage === 'foundation') {
    return { atRisk: false, targetStage: null, criteria: [], reasons: [] };
  }

  const last10 = history.slice(-10);
  const last7 = history.slice(-7);

  const frWeakDays = last10.filter((e) => e.foundation < 40 && e.regulation < 38).length;
  const regWeakDays = last7.filter((e) => e.regulation < 42).length;
  const mindWeakDays = last7.filter((e) => e.mind < 45).length;

  if (stage === 'regulation' || stage === 'mind' || stage === 'influence') {
    criteria.push({
      id: 'foundation_regulation_collapse',
      label: 'foundation<40 и regulation<38 (7/10 дн.)',
      met: frWeakDays >= 7,
      current: `${frWeakDays}/10`,
      target: '≥7/10',
    });
  }

  if (stage === 'mind' || stage === 'influence') {
    criteria.push({
      id: 'regulation_weak',
      label: 'regulation<42 (5/7 дн.)',
      met: regWeakDays >= 5,
      current: `${regWeakDays}/7`,
      target: '≥5/7',
    });
  }

  if (stage === 'influence') {
    criteria.push({
      id: 'mind_weak',
      label: 'mind<45 (5/7 дн.)',
      met: mindWeakDays >= 5,
      current: `${mindWeakDays}/7`,
      target: '≥5/7',
    });
  }

  let targetStage: StageId | null = null;

  if (frWeakDays >= 7) {
    targetStage = 'foundation';
    reasons.push('Проседание физиологической базы и саморегуляции');
  } else if (stage === 'influence' && mindWeakDays >= 5) {
    targetStage = 'mind';
    reasons.push('Проседание когнитивного этапа');
  } else if ((stage === 'mind' || stage === 'influence') && regWeakDays >= 5) {
    targetStage = 'regulation';
    reasons.push('Проседание саморегуляции');
  }

  const atRisk = targetStage != null;

  return {
    atRisk,
    targetStage,
    criteria,
    reasons,
  };
}

export function previousStage(stage: StageId): StageId | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i > 0 ? STAGE_ORDER[i - 1] : null;
}

export function buildReadinessHistoryEntry(
  date: string,
  readiness: ReadinessScores,
  qualified?: boolean
): ReadinessHistoryEntry {
  return {
    date,
    foundation: readiness.foundation,
    regulation: readiness.regulation,
    mind: readiness.mind,
    influence: readiness.influence,
    global: readiness.global,
    qualified,
  };
}

export function appendReadinessHistory(
  existing: ReadinessHistoryEntry[] | undefined,
  entry: ReadinessHistoryEntry
): ReadinessHistoryEntry[] {
  const filtered = (existing ?? []).filter((e) => e.date !== entry.date);
  return [...filtered, entry].slice(-READINESS_HISTORY_DAYS);
}

export { shouldThrottleCognitiveLoad };
