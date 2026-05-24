import { db, dateKeyDaysAgo, todayKey } from '../db';
import type { ReadinessScores } from '../domain/types';

export async function getInfluenceOpsSummary(): Promise<{
  miCount7d: number;
  nudgeCount7d: number;
  protocolDays7d: number;
  biasCount7d: number;
  observationCount7d: number;
  total7d: number;
  miStreak: number;
  protocolToday: boolean;
}> {
  const since = dateKeyDaysAgo(6);
  const entries = await db.influenceEntries.where('date').aboveOrEqual(since).toArray();

  const protocolDates = new Set(
    entries.filter((e) => e.type === 'protocol').map((e) => e.date)
  );

  return {
    miCount7d: entries.filter((e) => e.type === 'mi').length,
    nudgeCount7d: entries.filter((e) => e.type === 'nudge').length,
    protocolDays7d: protocolDates.size,
    biasCount7d: entries.filter((e) => e.type === 'bias').length,
    observationCount7d: entries.filter(
      (e) => e.type === 'observation' || e.type === 'debrief'
    ).length,
    total7d: entries.length,
    miStreak: await getMiStreak(),
    protocolToday: await hadProtocolToday(),
  };
}

export async function getMiStreak(): Promise<number> {
  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    const count = await db.influenceEntries
      .where('date')
      .equals(key)
      .filter((e) => e.type === 'mi')
      .count();
    if (count > 0) streak++;
    else break;
  }
  return streak;
}

export async function hadProtocolToday(): Promise<boolean> {
  return (
    (await db.influenceEntries
      .where('date')
      .equals(todayKey())
      .filter((e) => e.type === 'protocol')
      .count()) > 0
  );
}

export function shouldThrottleInfluence(readiness: ReadinessScores): boolean {
  return (
    readiness.foundation < 45 ||
    readiness.regulation < 40 ||
    readiness.mind < 40
  );
}
