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
import { INTEGRATION_THRESHOLDS as T } from './integration-thresholds';
import { shouldThrottleCognitiveLoad } from './mind-metrics';

export const QUALIFYING_DAYS_REQUIRED = T.qualifyingDaysRequired;
export const SOFT_SCORE_REQUIRED = T.softScoreRequired;
export const READINESS_HISTORY_DAYS = T.readinessHistoryDays;

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

export function computeSoftScore(criteria: StageGateCriterion[]): number {
  const soft = criteria.filter((c) => c.severity === 'soft');
  if (soft.length === 0) return 100;
  const totalWeight = soft.reduce((a, c) => a + c.weight, 0);
  const metWeight = soft.filter((c) => c.met).reduce((a, c) => a + c.weight, 0);
  return Math.round((metWeight / totalWeight) * 100);
}

function evaluateFoundationToRegulation(ctx: StageGateContext): StageGateCriterion[] {
  const { readiness, complianceAvg7d, debriefRate7d, briefingRate7d, bftDaysSince, trainingSessions7d, readinessHistory } =
    ctx;
  const g = T.f2r;
  const bftOk = bftDaysSince != null && bftDaysSince <= g.bftMaxDays;
  const trainingOk = trainingSessions7d >= g.trainingMin7d;
  const foundationDays65 = countHistoryWhere(
    readinessHistory,
    14,
    (e) => e.foundation >= g.foundationHistoryFloor
  );

  return [
    criterion('foundation_score', 'Readiness FOUNDATION', readiness.foundation >= g.foundationMin, readiness.foundation, `≥${g.foundationMin}`, 'blocker'),
    criterion('global_score', 'Global readiness', readiness.global >= g.globalMin, readiness.global, `≥${g.globalMin}`, 'blocker'),
    criterion('compliance_7d', 'Compliance 7д', complianceAvg7d >= g.complianceMin, complianceAvg7d, `≥${g.complianceMin}%`, 'blocker'),
    criterion('debrief_7d', 'Debrief rate 7д', debriefRate7d >= g.debriefMin, debriefRate7d, `≥${g.debriefMin}%`, 'blocker'),
    criterion(
      'bft_or_training',
      'BFT ≤90д или ≥2 тренировки/7д',
      bftOk || trainingOk,
      bftOk ? `BFT ${bftDaysSince}д` : `${trainingSessions7d} трен.`,
      `BFT≤${g.bftMaxDays}д | ≥${g.trainingMin7d} трен.`,
      'blocker'
    ),
    criterion(
      'foundation_days_14',
      `10/14 дней foundation≥${g.foundationHistoryFloor}`,
      foundationDays65 >= g.foundationDays14Min,
      `${foundationDays65}/14`,
      `≥${g.foundationDays14Min}/14`,
      'soft',
      15
    ),
    criterion('briefing_7d', 'Briefing rate 7д', briefingRate7d >= g.briefingMin, briefingRate7d, `≥${g.briefingMin}%`, 'soft', 10),
  ];
}

function evaluateRegulationToMind(ctx: StageGateContext): StageGateCriterion[] {
  const {
    readiness,
    complianceAvg7d,
    debriefRate7d,
    resonantBreath7d,
    hrvDays7d,
    readinessHistory,
  } = ctx;
  const g = T.r2m;
  const regulationStreak14 = countHistoryWhere(
    readinessHistory,
    14,
    (e) => e.regulation >= g.regulationHistoryFloor && e.foundation >= g.foundationHistoryFloor
  );

  return [
    criterion('foundation_floor', 'FOUNDATION (база)', readiness.foundation >= g.foundationFloor, readiness.foundation, `≥${g.foundationFloor}`, 'blocker'),
    criterion('regulation_score', 'Readiness REGULATION', readiness.regulation >= g.regulationMin, readiness.regulation, `≥${g.regulationMin}`, 'blocker'),
    criterion('global_score', 'Global readiness', readiness.global >= g.globalMin, readiness.global, `≥${g.globalMin}`, 'blocker'),
    criterion(
      'regulation_practice',
      'Regulation practice 14д',
      regulationStreak14 >= g.regulationPractice14Min,
      regulationStreak14,
      `≥${g.regulationPractice14Min}/14`,
      'blocker'
    ),
    criterion('hrv_7d', 'HRV записей 7д', hrvDays7d >= g.hrvDays7Min, hrvDays7d, `≥${g.hrvDays7Min}`, 'blocker'),
    criterion('debrief_7d', 'Debrief rate 7д', debriefRate7d >= g.debriefMin, debriefRate7d, `≥${g.debriefMin}%`, 'blocker'),
    criterion('resonant_7d', 'Резонансное дыхание 7д', resonantBreath7d >= g.resonant7Min, resonantBreath7d, `≥${g.resonant7Min}`, 'soft', 12),
    criterion('compliance_7d', 'Compliance 7д', complianceAvg7d >= g.complianceMin, complianceAvg7d, `≥${g.complianceMin}%`, 'soft', 10),
  ];
}

function evaluateMindToInfluence(ctx: StageGateContext): StageGateCriterion[] {
  const {
    readiness,
    complianceAvg7d,
    scenarios14d,
    decisions14d,
    cognitiveThrottle,
    readinessHistory,
  } = ctx;
  const g = T.m2i;
  const mindStreak14 = countHistoryWhere(
    readinessHistory,
    14,
    (e) =>
      e.mind >= g.mindHistoryFloor &&
      e.foundation >= g.foundationHistoryFloor &&
      e.regulation >= g.regulationHistoryFloor
  );

  return [
    criterion('foundation_floor', 'FOUNDATION (база)', readiness.foundation >= g.foundationFloor, readiness.foundation, `≥${g.foundationFloor}`, 'blocker'),
    criterion('regulation_floor', 'REGULATION (база)', readiness.regulation >= g.regulationFloor, readiness.regulation, `≥${g.regulationFloor}`, 'blocker'),
    criterion('mind_score', 'Readiness MIND', readiness.mind >= g.mindMin, readiness.mind, `≥${g.mindMin}`, 'blocker'),
    criterion('global_score', 'Global readiness', readiness.global >= g.globalMin, readiness.global, `≥${g.globalMin}`, 'blocker'),
    criterion(
      'mind_practice',
      'Mind practice 14д',
      mindStreak14 >= g.mindPractice14Min,
      mindStreak14,
      `≥${g.mindPractice14Min}/14`,
      'blocker'
    ),
    criterion('scenarios_14d', 'SWOT/сценарии 14д', scenarios14d >= g.scenarios14Min, scenarios14d, `≥${g.scenarios14Min}`, 'blocker'),
    criterion(
      'cognitive_throttle',
      'Когнитивная нагрузка',
      !cognitiveThrottle,
      cognitiveThrottle ? 'throttle ON' : 'OK',
      'без throttle',
      'blocker'
    ),
    criterion('compliance_7d', 'Compliance 7д', complianceAvg7d >= g.complianceMin, complianceAvg7d, `≥${g.complianceMin}%`, 'soft', 12),
    criterion('decisions_14d', 'Decision log 14д', decisions14d >= g.decisions14Min, decisions14d, `≥${g.decisions14Min}`, 'soft', 8),
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

function countQualifyingDaysFromHistory(history: ReadinessHistoryEntry[]): number {
  return history.filter((e) => e.qualified).length;
}

export function evaluateDemotionRisk(ctx: StageGateContext): DemotionEvaluation {
  const stage = ctx.profile.currentStage;
  const history = ctx.readinessHistory;
  const criteria: DemotionEvaluation['criteria'] = [];
  const reasons: string[] = [];
  const d = T.demotion;

  if (stage === 'foundation') {
    return { atRisk: false, targetStage: null, criteria: [], reasons: [] };
  }

  const last10 = history.slice(-10);
  const last7 = history.slice(-7);

  const frWeakDays = last10.filter(
    (e) => e.foundation < d.frFoundationMax && e.regulation < d.frRegulationMax
  ).length;
  const regWeakDays = last7.filter((e) => e.regulation < d.regulationWeakMax).length;
  const mindWeakDays = last7.filter((e) => e.mind < d.mindWeakMax).length;

  if (stage === 'regulation' || stage === 'mind' || stage === 'influence') {
    criteria.push({
      id: 'foundation_regulation_collapse',
      label: `foundation<${d.frFoundationMax} и regulation<${d.frRegulationMax} (7/10 дн.)`,
      met: frWeakDays >= d.frWeakDays10,
      current: `${frWeakDays}/10`,
      target: `≥${d.frWeakDays10}/10`,
    });
  }

  if (stage === 'mind' || stage === 'influence') {
    criteria.push({
      id: 'regulation_weak',
      label: `regulation<${d.regulationWeakMax} (5/7 дн.)`,
      met: regWeakDays >= d.regulationWeakDays7,
      current: `${regWeakDays}/7`,
      target: `≥${d.regulationWeakDays7}/7`,
    });
  }

  if (stage === 'influence') {
    criteria.push({
      id: 'mind_weak',
      label: `mind<${d.mindWeakMax} (5/7 дн.)`,
      met: mindWeakDays >= d.mindWeakDays7,
      current: `${mindWeakDays}/7`,
      target: `≥${d.mindWeakDays7}/7`,
    });
  }

  let targetStage: StageId | null = null;

  if (frWeakDays >= d.frWeakDays10) {
    targetStage = 'foundation';
    reasons.push('Проседание физиологической базы и саморегуляции');
  } else if (stage === 'influence' && mindWeakDays >= d.mindWeakDays7) {
    targetStage = 'mind';
    reasons.push('Проседание когнитивного этапа');
  } else if ((stage === 'mind' || stage === 'influence') && regWeakDays >= d.regulationWeakDays7) {
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
