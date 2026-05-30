import type { HrvEntry, StressLogEntry } from '../domain/types';
import { REGULATION_THRESHOLDS as T } from './regulation-thresholds';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function clampInt(n: number, min: number, max: number): number | undefined {
  if (!Number.isFinite(n)) return undefined;
  const r = Math.round(n);
  if (r < min || r > max) return undefined;
  return r;
}

export function validateHrvEntry(entry: Omit<HrvEntry, 'id'>): ValidationResult {
  const errors: string[] = [];
  if (!entry.date?.trim()) errors.push('date required');

  if (entry.rmssd != null) {
    const v = clampInt(entry.rmssd, T.rmssdMin, T.rmssdMax);
    if (v == null) errors.push(`rmssd must be ${T.rmssdMin}–${T.rmssdMax}`);
  }

  if (entry.restingHr != null) {
    const v = clampInt(entry.restingHr, T.restingHrMin, T.restingHrMax);
    if (v == null) errors.push(`restingHr must be ${T.restingHrMin}–${T.restingHrMax}`);
  }

  if (entry.subjectiveReadiness != null) {
    const v = clampInt(entry.subjectiveReadiness, T.subjectiveReadinessMin, T.subjectiveReadinessMax);
    if (v == null) {
      errors.push(`subjectiveReadiness must be ${T.subjectiveReadinessMin}–${T.subjectiveReadinessMax}`);
    }
  }

  if (entry.rmssd == null && entry.restingHr == null && entry.subjectiveReadiness == null) {
    errors.push('at least one of rmssd, restingHr, subjectiveReadiness required');
  }

  return { ok: errors.length === 0, errors };
}

export function sanitizeHrvEntry(entry: Omit<HrvEntry, 'id'>): Omit<HrvEntry, 'id'> {
  return {
    ...entry,
    rmssd:
      entry.rmssd != null
        ? clampInt(entry.rmssd, T.rmssdMin, T.rmssdMax)
        : undefined,
    restingHr:
      entry.restingHr != null
        ? clampInt(entry.restingHr, T.restingHrMin, T.restingHrMax)
        : undefined,
    subjectiveReadiness:
      entry.subjectiveReadiness != null
        ? clampInt(entry.subjectiveReadiness, T.subjectiveReadinessMin, T.subjectiveReadinessMax)
        : undefined,
  };
}

export function validateStressLogEntry(entry: Omit<StressLogEntry, 'id'>): ValidationResult {
  const errors: string[] = [];
  if (!entry.date?.trim()) errors.push('date required');
  if (!entry.trigger?.trim()) errors.push('trigger required');

  if (entry.arousalBefore != null) {
    const v = clampInt(entry.arousalBefore, T.arousalMin, T.arousalMax);
    if (v == null) errors.push(`arousalBefore must be ${T.arousalMin}–${T.arousalMax}`);
  }
  if (entry.arousalAfter != null) {
    const v = clampInt(entry.arousalAfter, T.arousalMin, T.arousalMax);
    if (v == null) errors.push(`arousalAfter must be ${T.arousalMin}–${T.arousalMax}`);
  }

  return { ok: errors.length === 0, errors };
}

export function sanitizeStressLogEntry(
  entry: Omit<StressLogEntry, 'id'>
): Omit<StressLogEntry, 'id'> {
  return {
    ...entry,
    arousalBefore:
      entry.arousalBefore != null
        ? clampInt(entry.arousalBefore, T.arousalMin, T.arousalMax)
        : undefined,
    arousalAfter:
      entry.arousalAfter != null
        ? clampInt(entry.arousalAfter, T.arousalMin, T.arousalMax)
        : undefined,
  };
}
