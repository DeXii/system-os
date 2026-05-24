import { db, dateKeyDaysAgo, todayKey } from '../db';
import type { ReadinessScores } from '../domain/types';
import { getReadingProgressByLevel, getWeeklyReadingStatus } from './library-books';

export interface RatingTrendPoint {
  date: string;
  rating: number;
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

export async function getMindStreak(): Promise<number> {
  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    const chess = await db.chessGoSessions.where('date').equals(key).count();
    const reflect = await db.reflections.where('date').equals(key).count();
    if (chess > 0 && reflect > 0) streak++;
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
  return readiness.foundation < 45 || readiness.regulation < 40;
}

export async function getMindOpsSummary(): Promise<{
  chessSessions7d: number;
  chessMinutes7d: number;
  reflections7d: number;
  scenarios7d: number;
  decisions7d: number;
  streak: number;
  readingProgress: Awaited<ReturnType<typeof getReadingProgressByLevel>>;
  weeklyReading: Awaited<ReturnType<typeof getWeeklyReadingStatus>>;
}> {
  const since = dateKeyDaysAgo(6);
  const [chessSessions7d, reflections7d, scenarios7d, decisions7d] = await Promise.all([
    db.chessGoSessions.where('date').aboveOrEqual(since).count(),
    db.reflections.where('date').aboveOrEqual(since).count(),
    getScenarioCount7d(),
    db.decisionLogs.where('date').aboveOrEqual(since).count(),
  ]);
  return {
    chessSessions7d,
    chessMinutes7d: await getChessMinutes7d(),
    reflections7d,
    scenarios7d,
    decisions7d,
    streak: await getMindStreak(),
    readingProgress: await getReadingProgressByLevel(),
    weeklyReading: await getWeeklyReadingStatus(),
  };
}

export async function hadChessToday(): Promise<boolean> {
  return (await db.chessGoSessions.where('date').equals(todayKey()).count()) > 0;
}
