import { db, dateKeyDaysAgo } from '../db';
import { getDecisionClosureRate14d } from './decision-followup';
import { getWeeklyReadingStatus } from './library-books';
import { getMindParams, getRatingZScore } from './mind-params';
import { MIND_THRESHOLDS as T } from './mind-thresholds';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function hasChessSince(since: string): Promise<boolean> {
  return (await db.chessGoSessions.where('date').aboveOrEqual(since).count()) > 0;
}
async function hasReflectSince(since: string): Promise<boolean> {
  return (await db.reflections.where('date').aboveOrEqual(since).count()) > 0;
}
async function hasScenarioSince(since: string): Promise<boolean> {
  return (await db.scenarios.where('date').aboveOrEqual(since).count()) > 0;
}

async function isMindColdStart(): Promise<boolean> {
  const sinceCold = dateKeyDaysAgo(T.coldLookbackDays);
  const results = await Promise.all([
    hasChessSince(sinceCold),
    hasReflectSince(sinceCold),
    hasScenarioSince(sinceCold),
  ]);
  return !results.some(Boolean);
}

export interface MindReadinessComponents {
  chessCountScore: number;
  chessMinScore: number;
  reflectScore: number;
  scenarioScore: number;
  decisionScore: number;
  studyBonus: number;
  closureBonus: number;
  readingBonus: number;
  ratingBonus: number;
  total: number;
  capped: boolean;
}

export async function computeMindReadinessComponents(
  foundationScore: number,
  regulationScore: number
): Promise<MindReadinessComponents> {
  if (await isMindColdStart()) {
    return {
      chessCountScore: 0,
      chessMinScore: 0,
      reflectScore: 0,
      scenarioScore: 0,
      decisionScore: 0,
      studyBonus: 0,
      closureBonus: 0,
      readingBonus: 0,
      ratingBonus: 0,
      total: T.coldStart,
      capped: false,
    };
  }

  const since = dateKeyDaysAgo(7);
  const chessSessions = await db.chessGoSessions.where('date').aboveOrEqual(since).toArray();
  const chessCount = chessSessions.length;
  const chessMinutes = chessSessions.reduce((a, s) => a + s.durationMin, 0);
  const reflections = await db.reflections.where('date').aboveOrEqual(since).count();
  const scenarios = await db.scenarios.where('date').aboveOrEqual(since).count();
  const decisions = await db.decisionLogs.where('date').aboveOrEqual(since).count();

  const chessCountScore = Math.min(
    T.chessCountScoreMax,
    (chessCount / T.chessCountTarget7d) * T.chessCountScoreMax
  );
  const chessMinScore = Math.min(
    T.chessMinScoreMax,
    (chessMinutes / T.chessMinutesTarget7d) * T.chessMinScoreMax
  );
  const reflectScore = Math.min(
    T.reflectScoreMax,
    (reflections / T.reflectTarget7d) * T.reflectScoreMax
  );
  const scenarioScore = scenarios >= 1 ? T.scenarioScoreMax : 0;
  const decisionScore = decisions >= 1 ? T.decisionScoreMax : 0;

  let total =
    chessCountScore + chessMinScore + reflectScore + scenarioScore + decisionScore;

  const studyCount = await db.studySessions.where('date').aboveOrEqual(since).count();
  const studyBonus = Math.min(T.studyBonusMax, studyCount >= 2 ? T.studyBonusMax : studyCount * 2);
  total += studyBonus;

  const closurePct = await getDecisionClosureRate14d();
  let closureBonus = 0;
  if (closurePct >= T.closurePctHigh) closureBonus = T.closureBonusHigh;
  else if (closurePct >= T.closurePctMid) closureBonus = T.closureBonusMid;
  total += closureBonus;

  const weekly = await getWeeklyReadingStatus();
  const readingBonus = weekly.missionDone ? T.weeklyReadingBonus : 0;
  total += readingBonus;

  let ratingBonus = 0;
  const params = await getMindParams();
  const lastRated = [...chessSessions]
    .reverse()
    .find((s) => (s.ratingAfter ?? s.rating) != null);
  if (lastRated) {
    const r = lastRated.ratingAfter ?? lastRated.rating!;
    const z = getRatingZScore(r, params);
    if (z != null && z >= T.ratingZProgress) ratingBonus = T.ratingProgressBonus;
  }
  total += ratingBonus;

  let capped = false;
  if (foundationScore < T.foundationCapBelow || regulationScore < T.regulationCapBelow) {
    total = Math.min(total, T.readinessCapWhenLowBase);
    capped = true;
  }

  return {
    chessCountScore,
    chessMinScore,
    reflectScore,
    scenarioScore,
    decisionScore,
    studyBonus,
    closureBonus,
    readingBonus,
    ratingBonus,
    total: clamp(total),
    capped,
  };
}

export async function computeMindScore(
  foundationScore: number,
  regulationScore: number
): Promise<number> {
  const c = await computeMindReadinessComponents(foundationScore, regulationScore);
  return c.total;
}
