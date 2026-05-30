import { db, dateKeyDaysAgo, todayKey } from '../db';
import type { BreathingSession, HrvEntry, OperatorRegulationParams, StressLogEntry } from '../domain/types';
import { REGULATION_THRESHOLDS as T } from './regulation-thresholds';

const ALPHA_HRV = 0.12;
const ALPHA_PST = 0.2;
const ALPHA_WIM = 0.05;
const ALPHA_DOSE = 0.1;

const DEFAULT_PARAMS: OperatorRegulationParams = {
  id: 'regulation-params',
  hrvBaselineEma: 0,
  hrvSigmaEma: 400,
  resonantDoseTargetMin: 70,
  wimHofTolerance: 0.35,
  pstEfficacy: 0.5,
  lastUpdated: new Date().toISOString(),
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function getRegulationParams(): Promise<OperatorRegulationParams> {
  const row = await db.operatorRegulationParams.get('regulation-params');
  return row ?? { ...DEFAULT_PARAMS, lastUpdated: new Date().toISOString() };
}

export async function saveRegulationParams(
  patch: Partial<Omit<OperatorRegulationParams, 'id'>>
): Promise<OperatorRegulationParams> {
  const current = await getRegulationParams();
  const next: OperatorRegulationParams = {
    ...current,
    ...patch,
    id: 'regulation-params',
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorRegulationParams.put(next);
  return next;
}

export async function updateRegulationParamsFromHrv(
  entry: Omit<HrvEntry, 'id'>
): Promise<OperatorRegulationParams> {
  if (entry.rmssd == null || entry.rmssd <= 0) return getRegulationParams();

  const current = await getRegulationParams();
  const rmssd = entry.rmssd;
  const baseline =
    current.hrvBaselineEma > 0 ? current.hrvBaselineEma : rmssd;
  const dev = rmssd - baseline;
  const hrvBaselineEma = (1 - ALPHA_HRV) * baseline + ALPHA_HRV * rmssd;
  const hrvSigmaEma = Math.max(
    25,
    (1 - ALPHA_HRV) * current.hrvSigmaEma + ALPHA_HRV * dev * dev
  );

  return saveRegulationParams({ hrvBaselineEma, hrvSigmaEma });
}

export async function updateRegulationParamsFromStress(
  entry: Omit<StressLogEntry, 'id'>
): Promise<OperatorRegulationParams> {
  const current = await getRegulationParams();
  if (
    entry.arousalBefore == null ||
    entry.arousalAfter == null ||
    entry.arousalBefore < entry.arousalAfter
  ) {
    return current;
  }

  const delta = entry.arousalBefore - entry.arousalAfter;
  const signal = clamp01(delta / 5);
  const pstEfficacy = clamp01((1 - ALPHA_PST) * current.pstEfficacy + ALPHA_PST * signal);
  return saveRegulationParams({ pstEfficacy });
}

export async function updateRegulationParamsFromBreathing(
  session: Omit<BreathingSession, 'id'>
): Promise<OperatorRegulationParams> {
  const current = await getRegulationParams();
  let patch: Partial<OperatorRegulationParams> = {};

  if (session.mode === 'resonant') {
    const since = dateKeyDaysAgo(6);
    const sessions = await db.breathingSessions
      .where('date')
      .aboveOrEqual(since)
      .toArray();
    const resonantMin = sessions
      .filter((s) => s.mode === 'resonant')
      .reduce((a, s) => a + s.durationMin, 0);
    const resonantDoseTargetMin = Math.max(
      40,
      (1 - ALPHA_DOSE) * current.resonantDoseTargetMin + ALPHA_DOSE * resonantMin
    );
    patch = { ...patch, resonantDoseTargetMin };
  }

  if (session.mode === 'wim_hof') {
    const yesterday = dateKeyDaysAgo(1);
    const today = todayKey();
    const hrvAfter = await db.hrvEntries.where('date').equals(today).first();
    const hrvBefore = await db.hrvEntries.where('date').equals(yesterday).first();
    let wimHofTolerance = current.wimHofTolerance;
    if (
      hrvAfter?.rmssd != null &&
      hrvBefore?.rmssd != null &&
      hrvAfter.rmssd >= hrvBefore.rmssd * T.baselineRatio
    ) {
      wimHofTolerance = clamp01(
        (1 - ALPHA_WIM) * wimHofTolerance + ALPHA_WIM * 1
      );
    } else if (hrvAfter?.rmssd != null && hrvAfter.rmssd < T.wimHofLowRmssd) {
      wimHofTolerance = clamp01((1 - ALPHA_WIM) * wimHofTolerance);
    }
    patch = { ...patch, wimHofTolerance };
  }

  if (Object.keys(patch).length === 0) return current;
  return saveRegulationParams(patch);
}
