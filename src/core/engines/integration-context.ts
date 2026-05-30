import { db, dateKeyDaysAgo } from '../db';
import type { OperatorProfile, ReadinessScores } from '../domain/types';
import { getBreathing7dSummary, getRegulationPractice14d } from './regulation-metrics';
import { getMindPractice14d, getScenarioCount7d, shouldThrottleCognitiveLoad } from './mind-metrics';
import { computeReadiness } from './readiness';
import type { StageProgressState } from '../domain/types';
import { STAGE_ORDER } from '../domain/types';
import type { StageGateContext } from './stage-transition-rules';
import { getInfluenceOpsSummary } from './influence-metrics';
import { getMindOpsSummary } from './mind-metrics';
import { getRegulationStreak } from './regulation-metrics';
import {
  getIntegrationOpsSummaryFromBundle,
  type IntegrationContextBundle,
  type WeekOps7d,
} from './integration-metrics';

export type { IntegrationContextBundle, WeekOps7d };

async function loadStageProgress(): Promise<StageProgressState> {
  const existing = await db.stageProgress.get('progress');
  if (existing) return existing;
  return {
    id: 'progress',
    stageStreaks: Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as StageProgressState['stageStreaks'],
    globalStreak: 0,
    lastEvaluatedDate: '',
    qualifyingDays: 0,
    readinessHistory: [],
  };
}

export async function loadWeekOps7d(): Promise<WeekOps7d> {
  const since7 = dateKeyDaysAgo(6);
  const weekReports = await db.dayReports.where('date').aboveOrEqual(since7).toArray();
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
  return { weekReports, complianceAvg7d, debriefRate7d, briefingRate7d };
}

export async function buildIntegrationContextBundle(
  readiness: ReadinessScores
): Promise<IntegrationContextBundle> {
  const [
    weekOps,
    pdp,
    progress,
    mindOps7d,
    influenceOps7d,
    regulationStreak,
  ] = await Promise.all([
    loadWeekOps7d(),
    db.pdp.toCollection().first(),
    loadStageProgress(),
    getMindOpsSummary(),
    getInfluenceOpsSummary(),
    getRegulationStreak(),
  ]);

  const ops = await getIntegrationOpsSummaryFromBundle(readiness, {
    weekOps,
    pdp: pdp ?? null,
    progress,
    mindOps7d,
    influenceOps7d,
    regulationStreak,
  });

  return {
    weekOps,
    pdp: pdp ?? null,
    progress,
    mindOps7d,
    influenceOps7d,
    regulationStreak,
    ops,
  };
}

/** Shared gate context builder (used by stage progression and integration bundle). */
export async function buildStageGateContext(profile: OperatorProfile): Promise<StageGateContext> {
  const readiness = await computeReadiness();
  const since7 = dateKeyDaysAgo(6);
  const since14 = dateKeyDaysAgo(13);

  const [weekOps, scenarios14d, decisions14d, trainingSessions7d, bft, acft, progress] =
    await Promise.all([
      loadWeekOps7d(),
      db.scenarios.where('date').aboveOrEqual(since14).count(),
      db.decisionLogs.where('date').aboveOrEqual(since14).count(),
      db.trainingSessions.where('date').aboveOrEqual(since7).count(),
      db.bftEvents.orderBy('date').reverse().first(),
      db.acftEvents.orderBy('date').reverse().first(),
      loadStageProgress(),
    ]);

  const test = bft ?? acft;
  let bftDaysSince: number | null = null;
  if (test) {
    bftDaysSince = Math.floor((Date.now() - new Date(test.date).getTime()) / 86400000);
  }

  const since7hrv = dateKeyDaysAgo(6);
  const [hrvDays7d, breath7, scenarios7d, regulationStreak, mindStreak] = await Promise.all([
    db.hrvEntries.where('date').aboveOrEqual(since7hrv).count(),
    getBreathing7dSummary(),
    getScenarioCount7d(),
    getRegulationPractice14d(),
    getMindPractice14d(),
  ]);

  const since14influence = dateKeyDaysAgo(13);
  const influenceEntries = await db.influenceEntries
    .where('date')
    .aboveOrEqual(since14influence)
    .toArray();
  const miCount14d = influenceEntries.filter((e) => e.type === 'mi').length;

  return {
    profile,
    readiness,
    complianceAvg7d: weekOps.complianceAvg7d,
    debriefRate7d: weekOps.debriefRate7d,
    briefingRate7d: weekOps.briefingRate7d,
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
