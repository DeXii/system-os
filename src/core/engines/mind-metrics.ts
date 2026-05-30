import { db, dateKeyDaysAgo, todayKey } from '../db';
import type { ReadinessScores, ReflectionEntry } from '../domain/types';
import { getDecisionClosureRate14d } from './decision-followup';
import { getReadingProgressByLevel, getWeeklyReadingStatus } from './library-books';
import { getMindParams, getRatingZScore } from './mind-params';
import { MIND_THRESHOLDS as T } from './mind-thresholds';

export interface RatingTrendPoint {
  date: string;
  rating: number;
}

export interface MindDirective {
  calculationLine: string;
  actionLine: string;
  denyLine?: string;
}

export async function getChessRatingTrend(days = 30): Promise<RatingTrendPoint[]> {
  const since = dateKeyDaysAgo(days - 1);
  const sessions = await db.chessGoSessions.where('date').aboveOrEqual(since).toArray();
  return sessions
    .map((s) => ({
      date: s.date,
      rating: s.ratingAfter ?? s.rating,
    }))
    .filter((p): p is RatingTrendPoint => p.rating != null && p.rating > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRatingDelta7d(): Promise<number | null> {
  const trend = await getChessRatingTrend(7);
  if (trend.length < 2) return null;
  return trend[trend.length - 1].rating - trend[0].rating;
}

function reflectionDepth(entry: ReflectionEntry): number {
  const parts = [
    entry.plan,
    entry.monitor,
    entry.reflect,
    entry.observe,
    entry.orient,
    entry.decide,
    entry.act,
  ];
  const filled = parts.filter((p) => p?.trim()).length;
  const chars = parts.reduce((a, p) => a + (p?.trim().length ?? 0), 0);
  return Math.min(1, filled / 4 + Math.min(0.5, chars / 400));
}

export async function getReflectionDepthScore7d(): Promise<number> {
  const since = dateKeyDaysAgo(6);
  const rows = await db.reflections.where('date').aboveOrEqual(since).toArray();
  if (!rows.length) return 0;
  const sum = rows.reduce((a, r) => a + reflectionDepth(r), 0);
  return Math.round((sum / rows.length) * 100);
}

export async function getDecisionCalibration14d(): Promise<number> {
  const params = await getMindParams();
  return Math.round(params.decisionCalibration * 100);
}

export async function getCognitivePeakHour(): Promise<number | null> {
  const params = await getMindParams();
  return params.cognitivePeakHour ?? null;
}

/** Gate-aligned: days in last 14 with mind≥55, foundation≥48, regulation≥50. */
export async function getMindPractice14d(): Promise<number> {
  const progress = await db.stageProgress.get('progress');
  const history = progress?.readinessHistory ?? [];
  return history
    .slice(-14)
    .filter((e) => e.mind >= 55 && e.foundation >= 48 && e.regulation >= 50).length;
}

/** @deprecated Combo streak (chess+reflection same day); use getMindPractice14d for gates. */
export async function getMindStreak(): Promise<number> {
  const since = dateKeyDaysAgo(29);
  const [chessSessions, reflections] = await Promise.all([
    db.chessGoSessions.where('date').aboveOrEqual(since).toArray(),
    db.reflections.where('date').aboveOrEqual(since).toArray(),
  ]);
  const chessDays = new Set(chessSessions.map((s) => s.date));
  const reflectDays = new Set(reflections.map((r) => r.date));
  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    if (chessDays.has(key) && reflectDays.has(key)) streak++;
    else break;
  }
  return streak;
}

export async function getChessMinutes7d(): Promise<number> {
  const since = dateKeyDaysAgo(6);
  const sessions = await db.chessGoSessions.where('date').aboveOrEqual(since).toArray();
  return sessions.reduce((a, s) => a + s.durationMin, 0);
}

export async function getScenarioCount7d(): Promise<number> {
  const since = dateKeyDaysAgo(6);
  return db.scenarios.where('date').aboveOrEqual(since).count();
}

export function shouldThrottleCognitiveLoad(readiness: ReadinessScores): boolean {
  return (
    readiness.foundation < T.throttleFoundationBelow ||
    readiness.regulation < T.throttleRegulationBelow
  );
}

export async function getMindOpsSummary(): Promise<{
  chessSessions7d: number;
  chessMinutes7d: number;
  reflections7d: number;
  scenarios7d: number;
  decisions7d: number;
  studySessions7d: number;
  decisionClosurePct14d: number;
  decisionCalibrationPct: number;
  reflectionDepthPct7d: number;
  ratingDelta7d: number | null;
  cognitivePeakHour: number | null;
  streak: number;
  comboStreak: number;
  readingProgress: Awaited<ReturnType<typeof getReadingProgressByLevel>>;
  weeklyReading: Awaited<ReturnType<typeof getWeeklyReadingStatus>>;
}> {
  const since = dateKeyDaysAgo(6);
  const [chessSessions7d, reflections7d, scenarios7d, decisions7d, studySessions7d] =
    await Promise.all([
      db.chessGoSessions.where('date').aboveOrEqual(since).count(),
      db.reflections.where('date').aboveOrEqual(since).count(),
      getScenarioCount7d(),
      db.decisionLogs.where('date').aboveOrEqual(since).count(),
      db.studySessions.where('date').aboveOrEqual(since).count(),
    ]);
  return {
    chessSessions7d,
    chessMinutes7d: await getChessMinutes7d(),
    reflections7d,
    scenarios7d,
    decisions7d,
    studySessions7d,
    decisionClosurePct14d: await getDecisionClosureRate14d(),
    decisionCalibrationPct: await getDecisionCalibration14d(),
    reflectionDepthPct7d: await getReflectionDepthScore7d(),
    ratingDelta7d: await getRatingDelta7d(),
    cognitivePeakHour: await getCognitivePeakHour(),
    streak: await getMindPractice14d(),
    comboStreak: await getMindStreak(),
    readingProgress: await getReadingProgressByLevel(),
    weeklyReading: await getWeeklyReadingStatus(),
  };
}

export async function getRatingZToday(): Promise<number | null> {
  const today = await db.chessGoSessions.where('date').equals(todayKey()).first();
  const rating = today?.ratingAfter ?? today?.rating;
  if (rating == null || rating <= 0) return null;
  return getRatingZScore(rating, await getMindParams());
}

export async function buildMindDirective(
  readiness?: ReadinessScores
): Promise<MindDirective> {
  const { computeReadiness } = await import('./readiness');
  const r = readiness ?? (await computeReadiness());
  const ops = await getMindOpsSummary();
  const params = await getMindParams();
  const throttle = shouldThrottleCognitiveLoad(r);
  const zRating = await getRatingZToday();

  const calcParts = [
    `mind=${r.mind}`,
    `chess_min_7d=${ops.chessMinutes7d}`,
    `closure_14d=${ops.decisionClosurePct14d}%`,
    `calibration=${ops.decisionCalibrationPct}%`,
    `reflect_depth_7d=${ops.reflectionDepthPct7d}%`,
    zRating != null ? `z_rating=${zRating.toFixed(2)}` : null,
    `dose_target=${Math.round(params.chessDoseTargetMin)}min`,
    params.cognitivePeakHour != null ? `peak_hour=${params.cognitivePeakHour}` : null,
  ].filter(Boolean);

  const dailyChessMin = Math.max(
    10,
    Math.min(T.chessThrottleMaxMin, Math.round(params.chessDoseTargetMin * 0.35))
  );

  let action = `Chess ${dailyChessMin} мин (taskKey mind.chess); PMR short вечером (mind.reflect.short).`;
  if (throttle) {
    action = `Только chess ≤${T.chessThrottleMaxMin} мин + PMR short; SWOT запрещён.`;
  } else if (ops.decisionClosurePct14d < T.closureLowPct) {
    action = 'Закрыть 1 decision follow-up (mind.decision.followup); SWOT отложить.';
  } else if (params.swotTolerance >= T.swotToleranceMin && !throttle) {
    action += ' SWOT допустим при событии (mind.scenario).';
  }

  let denyLine: string | undefined;
  if (throttle) {
    denyLine =
      '[ОТКАЗ] Тяжёлый SWOT: foundation/regulation ниже порога когнитивного throttle.';
  } else if (params.swotTolerance < T.swotToleranceMin) {
    denyLine = '[ОТКАЗ] SWOT: низкая калибровка решений — сначала закрыть прогнозы.';
  }

  return {
    calculationLine: `[РАСЧЁТ] ${calcParts.join(' · ')}`,
    actionLine: `[ДЕЙСТВИЕ] ${action}`,
    denyLine,
  };
}

export function formatMindDirectiveForPrompt(d: MindDirective): string {
  return [d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n');
}

export async function hadChessToday(): Promise<boolean> {
  return (await db.chessGoSessions.where('date').equals(todayKey()).count()) > 0;
}
