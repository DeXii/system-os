import type { InfluenceEntry } from '../domain/types';

/** Fraction of OARS / MI fields filled (0–1). */
export function oarsCompleteness(entry: InfluenceEntry): number {
  const fields = [
    entry.situation ?? entry.context,
    entry.openQuestions,
    entry.affirmReflect,
    entry.summarize,
    entry.whatWorked,
    entry.outcome,
  ];
  const filled = fields.filter((f) => f?.trim()).length;
  return Math.max(0, Math.min(1, filled / fields.length));
}

/** Map free-text outcome to 0–1 signal; null if unknown. */
export function outcomeTo01(outcome?: string): number | null {
  const t = outcome?.trim().toLowerCase() ?? '';
  if (!t) return null;
  if (/^\+?[1-5]$/.test(t)) {
    const n = Number(t);
    return Math.max(0, Math.min(1, (n - 1) / 4));
  }
  if (/успех|win|получилось|лучше|да\b|positive|\+/.test(t)) return 1;
  if (/провал|fail|хуже|нет\b|отказ|negative|\-/.test(t)) return 0;
  if (/нейтр|neutral|смешан|partial/.test(t)) return 0.5;
  return null;
}
