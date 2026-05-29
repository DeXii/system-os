import { db, dateKeyDaysAgo, todayKey } from '../db';
import { computeReadiness } from './readiness';
import { confirmStageAdvanceKernel, confirmStageDemotionKernel } from './os-kernel';
import { emitKernel } from '../events/event-bus';
import { getBreathing7dSummary, getRegulationPractice14d } from './regulation-metrics';
import { getMindPractice14d, getScenarioCount7d, shouldThrottleCognitiveLoad } from './mind-metrics';
import {
  appendReadinessHistory,
  buildReadinessHistoryEntry,
  evaluateDemotionRisk,
  evaluateTransitionGates,
  isTodayQualifying,
  QUALIFYING_DAYS_REQUIRED,
  type StageGateContext,
} from './stage-transition-rules';
import {
  type OperatorProfile,
  type StageGateEvaluation,
  type StageId,
  type StageProgressState,
  STAGE_ORDER,
} from '../domain/types';

export async function getStageProgress(): Promise<StageProgressState> {
  const existing = await db.stageProgress.get('progress');
  if (existing) return existing;
  const initial: StageProgressState = {
    id: 'progress',
    stageStreaks: {
      foundation: 0,
      regulation: 0,
      mind: 0,
      influence: 0,
    },
    globalStreak: 0,
    lastEvaluatedDate: '',
    qualifyingDays: 0,
    readinessHistory: [],
  };
  await db.stageProgress.put(initial);
  return initial;
}

async function buildStageGateContext(profile: OperatorProfile): Promise<StageGateContext> {
  const readiness = await computeReadiness();
  const since7 = dateKeyDaysAgo(6);
  const since14 = dateKeyDaysAgo(13);

  const [weekReports, scenarios14d, decisions14d, trainingSessions7d, bft, acft, progress] =
    await Promise.all([
      db.dayReports.where('date').aboveOrEqual(since7).toArray(),
      db.scenarios.where('date').aboveOrEqual(since14).count(),
      db.decisionLogs.where('date').aboveOrEqual(since14).count(),
      db.trainingSessions.where('date').aboveOrEqual(since7).count(),
      db.bftEvents.orderBy('date').reverse().first(),
      db.acftEvents.orderBy('date').reverse().first(),
      getStageProgress(),
    ]);

  const complianceAvg7d =
    weekReports.length === 0
      ? 0
      : Math.round(weekReports.reduce((a, r) => a + r.compliance, 0) / weekReports.length);
  const debriefRate7d =
    weekReports.length === 0
      ? 0
      : Math.round((weekReports.filter((r) => r.debriefDone).length / weekReports.length) * 100);
  const briefingRate7d =
    weekReports.length === 0
      ? 0
      : Math.round((weekReports.filter((r) => r.briefingDone).length / weekReports.length) * 100);

  const test = bft ?? acft;
  let bftDaysSince: number | null = null;
  if (test) {
    bftDaysSince = Math.floor((Date.now() - new Date(test.date).getTime()) / 86400000);
  }

  const since7hrv = dateKeyDaysAgo(6);
  const hrvDays7d = await db.hrvEntries.where('date').aboveOrEqual(since7hrv).count();
  const breath7 = await getBreathing7dSummary();
  const since14influence = dateKeyDaysAgo(13);
  const influenceEntries = await db.influenceEntries
    .where('date')
    .aboveOrEqual(since14influence)
    .toArray();
  const miCount14d = influenceEntries.filter((e) => e.type === 'mi').length;

  const [regulationStreak, mindStreak] = await Promise.all([
    getRegulationPractice14d(),
    getMindPractice14d(),
  ]);

  const scenarios7d = await getScenarioCount7d();

  return {
    profile,
    readiness,
    complianceAvg7d,
    debriefRate7d,
    briefingRate7d,
    regulationStreak,
    resonantBreath7d: breath7.resonant,
    hrvDays7d,
    mindStreak,
    scenarios14d: Math.max(scenarios14d, scenarios7d),
    decisions14d,
    cognitiveThrottle: shouldThrottleCognitiveLoad(readiness),
    bftDaysSince,
    trainingSessions7d,
    miCount14d,
    readinessHistory: progress.readinessHistory ?? [],
  };
}

export async function evaluateStageProgression(
  profile: OperatorProfile
): Promise<StageProgressState> {
  const today = todayKey();
  let progress = await getStageProgress();

  if (progress.lastEvaluatedDate === today) {
    return progress;
  }

  const ctxBase = await buildStageGateContext(profile);
  const ctxProbe: StageGateContext = { ...ctxBase, readinessHistory: progress.readinessHistory ?? [] };
  const probeEval = evaluateTransitionGates(ctxProbe);
  const todayQualified = isTodayQualifying(probeEval.criteria, probeEval.softScore);
  const history = appendReadinessHistory(
    progress.readinessHistory,
    buildReadinessHistoryEntry(today, ctxBase.readiness, todayQualified)
  );
  const ctx: StageGateContext = { ...ctxBase, readinessHistory: history };
  const gateEval = evaluateTransitionGates(ctx);
  const demotionEval = evaluateDemotionRisk(ctx);
  const qualifyingDays = gateEval.qualifyingDays;

  const current = profile.currentStage;
  const stageStreaks = { ...progress.stageStreaks };
  if (gateEval.blockersMet && gateEval.softScore >= 80) {
    stageStreaks[current] = (stageStreaks[current] ?? 0) + 1;
  } else {
    stageStreaks[current] = 0;
  }

  let globalStreak = progress.globalStreak;
  if (ctx.readiness.global >= 58) {
    globalStreak += 1;
  } else {
    globalStreak = 0;
  }

  let pendingAdvance = progress.pendingAdvance;
  let pendingDemotion = progress.pendingDemotion;

  const advanceSnoozed = progress.advanceSnoozeUntil && progress.advanceSnoozeUntil >= today;
  const demotionSnoozed = progress.demotionSnoozeUntil && progress.demotionSnoozeUntil >= today;

  if (
    gateEval.eligible &&
    gateEval.toStage &&
    !pendingAdvance &&
    !advanceSnoozed &&
    !demotionEval.atRisk
  ) {
    pendingAdvance = gateEval.toStage;
    await emitKernel(
      'command',
      `Рекомендация: переход на этап ${gateEval.toStage}`,
      'success'
    );
  }

  if (demotionEval.atRisk && demotionEval.targetStage && !pendingDemotion && !demotionSnoozed) {
    pendingDemotion = demotionEval.targetStage;
    await emitKernel(
      'integration',
      `Рекомендация: откат на этап ${demotionEval.targetStage}`,
      'warn'
    );
  }

  const updated: StageProgressState = {
    ...progress,
    stageStreaks,
    globalStreak,
    lastEvaluatedDate: today,
    pendingAdvance,
    pendingDemotion,
    qualifyingDays,
    lastGateSnapshot: { ...gateEval, qualifyingDays },
    readinessHistory: history,
  };
  await db.stageProgress.put(updated);
  return updated;
}

export async function confirmStageAdvance(
  profile: OperatorProfile,
  accept: boolean
): Promise<OperatorProfile> {
  const progress = await getStageProgress();
  if (!progress.pendingAdvance) return profile;

  if (accept) {
    const updated = await confirmStageAdvanceKernel(
      profile,
      true,
      progress.pendingAdvance
    );
    const resetStreaks: Record<StageId, number> = {
      foundation: 0,
      regulation: 0,
      mind: 0,
      influence: 0,
    };
    await db.stageProgress.put({
      ...progress,
      pendingAdvance: undefined,
      pendingDemotion: undefined,
      stageStreaks: resetStreaks,
      globalStreak: 0,
      qualifyingDays: 0,
      readinessHistory: [],
      lastEvaluatedDate: '',
    });
    await evaluateStageProgression(updated);
    return updated;
  }

  const snooze = dateKeyDaysAgo(-7);
  await db.stageProgress.put({
    ...progress,
    pendingAdvance: undefined,
    advanceSnoozeUntil: snooze,
  });
  return profile;
}

export async function confirmStageDemotion(
  profile: OperatorProfile,
  accept: boolean
): Promise<OperatorProfile> {
  const progress = await getStageProgress();
  if (!progress.pendingDemotion) return profile;

  if (accept) {
    const updated = await confirmStageDemotionKernel(
      profile,
      true,
      progress.pendingDemotion
    );
    const resetStreaks: Record<StageId, number> = {
      foundation: 0,
      regulation: 0,
      mind: 0,
      influence: 0,
    };
    await db.stageProgress.put({
      ...progress,
      pendingDemotion: undefined,
      pendingAdvance: undefined,
      stageStreaks: resetStreaks,
      globalStreak: 0,
      qualifyingDays: 0,
      readinessHistory: [],
      lastEvaluatedDate: '',
    });
    await evaluateStageProgression(updated);
    return updated;
  }

  const snooze = dateKeyDaysAgo(-7);
  await db.stageProgress.put({
    ...progress,
    pendingDemotion: undefined,
    demotionSnoozeUntil: snooze,
  });
  return profile;
}

export function getGateProgress(
  progress: StageProgressState,
  _stage: StageId
): {
  evaluation: StageGateEvaluation | null;
  qualifyingDays: number;
  qualifyingRequired: number;
  softScoreRequired: number;
} {
  const evaluation = progress.lastGateSnapshot ?? null;
  return {
    evaluation,
    qualifyingDays: progress.qualifyingDays ?? evaluation?.qualifyingDays ?? 0,
    qualifyingRequired: QUALIFYING_DAYS_REQUIRED,
    softScoreRequired: 80,
  };
}

/** @deprecated Use getGateProgress */
export function getStreakProgress(progress: StageProgressState, stage: StageId) {
  const gate = getGateProgress(progress, stage);
  return {
    stageStreak: progress.stageStreaks[stage] ?? 0,
    globalStreak: progress.globalStreak,
    required: gate.qualifyingRequired,
    stageThreshold: 68,
    globalThreshold: 58,
    softScore: gate.evaluation?.softScore ?? 0,
    qualifyingDays: gate.qualifyingDays,
  };
}

export function isMaxStage(stage: StageId): boolean {
  return STAGE_ORDER.indexOf(stage) === STAGE_ORDER.length - 1;
}

export function getFailedBlockers(evaluation: StageGateEvaluation | null): string[] {
  if (!evaluation) return [];
  return evaluation.criteria.filter((c) => c.severity === 'blocker' && !c.met).map((c) => c.label);
}
