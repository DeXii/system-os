import { STAGES } from '@/content/stages';
import { db } from '../db';
import type {
  AiInsight,
  PersonalDevelopmentPlan,
  ReadinessHistoryEntry,
  ReadinessScores,
  StageId,
  StageProgressState,
} from '../domain/types';
import { STAGE_LABELS, STAGE_ORDER } from '../domain/types';
import type { getMindOpsSummary } from './mind-metrics';
import type { getInfluenceOpsSummary } from './influence-metrics';

type MindOpsSummary = Awaited<ReturnType<typeof getMindOpsSummary>>;
type InfluenceOpsSummary = Awaited<ReturnType<typeof getInfluenceOpsSummary>>;
import { INTEGRATION_THRESHOLDS as T } from './integration-thresholds';

export interface PyramidStageScore {
  stageId: StageId;
  stageNumber: number;
  name: string;
  score: number;
}

export interface WeekOps7d {
  weekReports: { date: string; compliance: number; debriefDone: boolean; briefingDone: boolean }[];
  complianceAvg7d: number;
  debriefRate7d: number;
  briefingRate7d: number;
}

export interface ReadinessDelta7d {
  foundation: number;
  regulation: number;
  mind: number;
  influence: number;
  global: number;
}

export interface IntegrationOpsSummary {
  stages: PyramidStageScore[];
  synergy: ReturnType<typeof getSynergySummary>;
  complianceAvg7d: number;
  debriefRate7d: number;
  daysSinceAudit: number | null;
  pdpCompletionPct: number;
  mindOps7d: MindOpsSummary;
  influenceOps7d: InfluenceOpsSummary;
  regulationStreak: number;
  readinessDelta7d: ReadinessDelta7d;
  synergyGap: number;
  synergyIndex: number;
}

export interface IntegrationContextBundle {
  weekOps: WeekOps7d;
  pdp: PersonalDevelopmentPlan | null;
  progress: StageProgressState;
  mindOps7d: MindOpsSummary;
  influenceOps7d: InfluenceOpsSummary;
  regulationStreak: number;
  ops: IntegrationOpsSummary;
}

const STAGE_SCORE_KEYS: StageId[] = ['foundation', 'regulation', 'mind', 'influence'];

export function computeSynergyGap(readiness: ReadinessScores): number {
  const scores = STAGE_SCORE_KEYS.map((k) => readiness[k]);
  return Math.max(...scores) - Math.min(...scores);
}

export function computeSynergyIndex(readiness: ReadinessScores): number {
  const gap = computeSynergyGap(readiness);
  return Math.round(Math.max(0, readiness.global - T.synergyGapPenalty * gap));
}

export function computeReadinessDelta7d(
  readiness: ReadinessScores,
  history: ReadinessHistoryEntry[] | undefined
): ReadinessDelta7d {
  const slice = (history ?? []).slice(-7);
  if (slice.length === 0) {
    return { foundation: 0, regulation: 0, mind: 0, influence: 0, global: 0 };
  }
  const avg = (key: keyof ReadinessHistoryEntry) =>
    Math.round(slice.reduce((a, e) => a + Number(e[key]), 0) / slice.length);
  return {
    foundation: readiness.foundation - avg('foundation'),
    regulation: readiness.regulation - avg('regulation'),
    mind: readiness.mind - avg('mind'),
    influence: readiness.influence - avg('influence'),
    global: readiness.global - avg('global'),
  };
}

export function getPyramidStageScores(readiness: ReadinessScores): PyramidStageScore[] {
  return STAGES.map((s) => ({
    stageId: s.id,
    stageNumber: s.number,
    name: s.name,
    score: readiness[s.id],
  }));
}

/** Lowest readiness stage; null if scores are balanced (spread ≤ tolerance). */
export function getWeakestPyramidStage(
  stages: PyramidStageScore[],
  tieSpread = T.bottleneckTieSpread
): PyramidStageScore | null {
  if (stages.length === 0) return null;

  const scores = stages.map((s) => s.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max - min <= tieSpread) return null;

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
    if (weakest.score < T.bottleneckDegraded) {
      recommendation += ' — degraded; снизить нагрузку верхних этапов';
    } else if (readiness.global < T.globalWeak) {
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
  const all = (await db.aiInsights.orderBy('createdAt').reverse().toArray()).filter(
    (i) => i.taskId === 'weeklyAudit'
  );
  return (
    all
      .filter((i) => i.scope === 'integration')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ??
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  );
}

export async function cacheLastWeeklyAudit(insight: AiInsight): Promise<void> {
  const progress = await db.stageProgress.get('progress');
  if (!progress) return;
  await db.stageProgress.put({
    ...progress,
    lastWeeklyAuditAt: insight.createdAt,
  });
}

export async function daysSinceLastAudit(): Promise<number | null> {
  const progress = await db.stageProgress.get('progress');
  const at = progress?.lastWeeklyAuditAt;
  if (at) {
    return Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
  }
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

export async function getIntegrationOpsSummaryFromBundle(
  readiness: ReadinessScores,
  bundle: Pick<
    IntegrationContextBundle,
    'weekOps' | 'pdp' | 'progress' | 'mindOps7d' | 'influenceOps7d' | 'regulationStreak'
  >
): Promise<IntegrationOpsSummary> {
  const { weekOps, pdp, progress, mindOps7d, influenceOps7d, regulationStreak } = bundle;
  const readinessDelta7d = computeReadinessDelta7d(readiness, progress.readinessHistory);
  const synergyGap = computeSynergyGap(readiness);
  const synergyIndex = computeSynergyIndex(readiness);

  let daysSinceAudit: number | null = null;
  if (progress.lastWeeklyAuditAt) {
    daysSinceAudit = Math.floor(
      (Date.now() - new Date(progress.lastWeeklyAuditAt).getTime()) / 86400000
    );
  } else {
    daysSinceAudit = await daysSinceLastAudit();
  }

  return {
    stages: getPyramidStageScores(readiness),
    synergy: getSynergySummary(readiness),
    complianceAvg7d: weekOps.complianceAvg7d,
    debriefRate7d: weekOps.debriefRate7d,
    daysSinceAudit,
    pdpCompletionPct: getPdpCompletionPct(pdp),
    mindOps7d,
    influenceOps7d,
    regulationStreak,
    readinessDelta7d,
    synergyGap,
    synergyIndex,
  };
}

export async function getIntegrationOpsSummary(
  readiness: ReadinessScores
): Promise<IntegrationOpsSummary> {
  const { buildIntegrationContextBundle } = await import('./integration-context');
  const bundle = await buildIntegrationContextBundle(readiness);
  return bundle.ops;
}
