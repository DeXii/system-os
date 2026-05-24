import { db, dateKeyDaysAgo, todayKey } from '../db';
import type { BreathingSession, HrvEntry } from '../domain/types';

export interface HrvTrendPoint {
  date: string;
  rmssd: number;
}

export function getHrvBaseline(entries: HrvEntry[]): number | null {
  const withRmssd = entries.filter((e) => e.rmssd != null && e.rmssd > 0);
  if (withRmssd.length < 3) return null;
  const sum = withRmssd.reduce((a, e) => a + (e.rmssd ?? 0), 0);
  return Math.round(sum / withRmssd.length);
}

export async function getHrvTrend(days = 14): Promise<HrvTrendPoint[]> {
  const since = dateKeyDaysAgo(days - 1);
  const entries = await db.hrvEntries.where('date').aboveOrEqual(since).toArray();
  return entries
    .filter((e) => e.rmssd != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, rmssd: e.rmssd! }));
}

export async function getHrvBaseline14d(): Promise<number | null> {
  const since = dateKeyDaysAgo(13);
  const entries = await db.hrvEntries.where('date').aboveOrEqual(since).toArray();
  return getHrvBaseline(entries);
}

export function isHrvBelowBaseline(entry: HrvEntry, baseline: number | null): boolean {
  if (!baseline || entry.rmssd == null) return false;
  return entry.rmssd < baseline * 0.85;
}

export async function getRegulationStreak(): Promise<number> {
  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    const hrv = await db.hrvEntries.where('date').equals(key).count();
    const breath = await db.breathingSessions.where('date').equals(key).count();
    const mindful = await db.mindfulnessSessions.where('date').equals(key).count();
    if (hrv > 0 && breath > 0 && mindful > 0) streak++;
    else break;
  }
  return streak;
}

export async function getBreathing7dSummary(): Promise<{
  resonant: number;
  wimHof: number;
  total: number;
}> {
  const since = dateKeyDaysAgo(6);
  const sessions = await db.breathingSessions.where('date').aboveOrEqual(since).toArray();
  const resonant = sessions.filter((s) => s.mode === 'resonant').length;
  const wimHof = sessions.filter((s) => s.mode === 'wim_hof').length;
  return { resonant, wimHof, total: sessions.length };
}

export async function getHrvTrendScore(): Promise<number> {
  const trend = await getHrvTrend(7);
  if (trend.length < 2) return 0;
  const first = trend.slice(0, Math.ceil(trend.length / 2));
  const second = trend.slice(Math.ceil(trend.length / 2));
  const avg = (pts: HrvTrendPoint[]) =>
    pts.reduce((a, p) => a + p.rmssd, 0) / Math.max(pts.length, 1);
  const delta = avg(second) - avg(first);
  if (delta > 5) return 15;
  if (delta > 0) return 8;
  if (delta < -5) return -10;
  return 0;
}

export async function hadWimHofToday(): Promise<boolean> {
  const sessions = await db.breathingSessions.where('date').equals(todayKey()).toArray();
  return sessions.some((s) => s.mode === 'wim_hof');
}

export async function hadResonantToday(): Promise<boolean> {
  const sessions = await db.breathingSessions.where('date').equals(todayKey()).toArray();
  return sessions.some((s) => s.mode === 'resonant');
}

export function summarizeBreathingSession(s: BreathingSession): string {
  if (s.mode === 'wim_hof') {
    return `Wim Hof ${s.rounds ?? '?'} раундов, retention ~${s.avgRetentionSec ?? '?'}с`;
  }
  return `Резонанс ${s.durationMin} мин @ ${s.breathsPerMin ?? '?'} вд/мин`;
}
