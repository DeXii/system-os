import { STAGES } from '@/content/stages';
import { db, dateKeyDaysAgo } from '../db';
import type {
  AiInsight,
  PersonalDevelopmentPlan,
  ReadinessScores,
  StageId,
} from '../domain/types';
import { STAGE_LABELS, STAGE_ORDER } from '../domain/types';
import { getInfluenceOpsSummary } from './influence-metrics';
import { getMindOpsSummary } from './mind-metrics';
import { getRegulationStreak } from './regulation-metrics';

export interface PyramidStageScore {
  stageId: StageId;
  stageNumber: number;
  name: string;
  score: number;
}

export function getPyramidStageScores(readiness: ReadinessScores): PyramidStageScore[] {
  return STAGES.map((s) => ({
    stageId: s.id,
    stageNumber: s.number,
    name: s.name,
    score: readiness[s.id],
  }));
}

const BOTTLENECK_TIE_SPREAD = 2;

/** Lowest readiness stage; null if scores are balanced (spread ≤2). */
export function getWeakestPyramidStage(stages: PyramidStageScore[]): PyramidStageScore | null {
  if (stages.length === 0) return null;

  const scores = stages.map((s) => s.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max - min <= BOTTLENECK_TIE_SPREAD) return null;

  const tiedMin = stages.filter((s) => s.score === min);
  if (tiedMin.length === 1) return tiedMin[0];

  return tiedMin.reduce((best, s) => {
    const bestIdx = STAGE_ORDER.indexOf(best.stageId);
    const idx = STAGE_ORDER.indexOf(s.stageId);
    return idx < bestIdx ? s : best;
  });
}

export function getSynergySummary(readiness: ReadinessScores): {
  bottleneck: number;
  weakestStage: StageId;
  weakestStageNumber: number;
  weakestLabel: string;
  global: number;
  recommendation: string;
  hasBottleneck: boolean;
} {
  const stageScores = getPyramidStageScores(readiness);
  const weakest = getWeakestPyramidStage(stageScores);

  let recommendation: string;
  if (!weakest) {
    recommendation = 'Система сбалансирована — явного узкого места нет';
  } else {
    recommendation = `Приоритет: ${STAGE_LABELS[weakest.stageId]} (${weakest.score})`;
    if (weakest.score < 40) {
      recommendation += ' — degraded; снизить нагрузку верхних этапов';
    } else if (readiness.global < 60) {
      recommendation += ' — укрепить базу перед расширением';
    }
  }

  const bottleneck = weakest?.score ?? Math.min(...stageScores.map((s) => s.score));

  return {
    bottleneck,
    weakestStage: weakest?.stageId ?? stageScores[0].stageId,
    weakestStageNumber: weakest?.stageNumber ?? stageScores[0].stageNumber,
    weakestLabel: weakest ? STAGE_LABELS[weakest.stageId] : '—',
    global: readiness.global,
    recommendation,
    hasBottleneck: weakest != null,
  };
}

export async function getLastWeeklyAudit(): Promise<AiInsight | undefined> {
  const all = await db.aiInsights.where('taskId').equals('weeklyAudit').toArray();
  return (
    all
      .filter((i) => i.scope === 'integration')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ??
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  );
}

export async function daysSinceLastAudit(): Promise<number | null> {
  const last = await getLastWeeklyAudit();
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last.createdAt).getTime()) / 86400000);
}

export function getPdpCompletionPct(pdp: PersonalDevelopmentPlan | null): number {
  if (!pdp) return 0;
  const parts = [
    Boolean(pdp.northStar?.trim()),
    pdp.goals.length > 0,
    Boolean(pdp.weeklyFocus?.trim()),
    Boolean(pdp.focusStage),
  ];
  const milestonePart =
    pdp.milestones.length === 0
      ? 0
      : pdp.milestones.filter((m) => m.done).length / pdp.milestones.length;
  return Math.round((parts.filter(Boolean).length / parts.length) * 0.6 * 100 + milestonePart * 40);
}

export async function getIntegrationOpsSummary(readiness: ReadinessScores) {
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
  const pdp = await db.pdp.toCollection().first();

  return {
    stages: getPyramidStageScores(readiness),
    synergy: getSynergySummary(readiness),
    complianceAvg7d,
    debriefRate7d,
    daysSinceAudit: await daysSinceLastAudit(),
    pdpCompletionPct: getPdpCompletionPct(pdp ?? null),
    mindOps7d: await getMindOpsSummary(),
    influenceOps7d: await getInfluenceOpsSummary(),
    regulationStreak: await getRegulationStreak(),
  };
}
