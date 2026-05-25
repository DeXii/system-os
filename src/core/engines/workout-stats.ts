import type { GppSubtype, WorkoutKind, WorkoutTypeStat } from '@/core/domain/types';
import { GPP_ROTATION } from '@/core/domain/types';
import { db, todayKey } from '../db';

export async function getWorkoutTypeStat(kind: WorkoutKind): Promise<WorkoutTypeStat> {
  const row = await db.workoutTypeStats.get(kind);
  return row ?? { kind, totalCount: 0, lastDate: null };
}

export async function incrementWorkoutTypeStat(kind: WorkoutKind, date = todayKey()): Promise<void> {
  const row = await getWorkoutTypeStat(kind);
  await db.workoutTypeStats.put({
    kind,
    totalCount: row.totalCount + 1,
    lastDate: date,
  });
}

export async function getLastGppSubtype(): Promise<GppSubtype | null> {
  let best: { sub: GppSubtype; date: string } | null = null;
  for (const sub of GPP_ROTATION) {
    const kind = `gpp_${sub}` as WorkoutKind;
    const stat = await getWorkoutTypeStat(kind);
    if (stat.lastDate && (!best || stat.lastDate > best.date)) {
      best = { sub, date: stat.lastDate };
    }
  }
  return best?.sub ?? null;
}

/** Следующий GPP по ротации push → pull → core → legs */
export async function getRecommendedGppSubtype(): Promise<GppSubtype> {
  const last = await getLastGppSubtype();
  if (!last) return 'push';
  const idx = GPP_ROTATION.indexOf(last);
  return GPP_ROTATION[(idx + 1) % GPP_ROTATION.length];
}

export function formatStatBadge(stat: WorkoutTypeStat): string {
  const count = stat.totalCount;
  const date = stat.lastDate ? stat.lastDate.slice(5) : '—';
  return `${count} · ${date}`;
}
