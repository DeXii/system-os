import { db, dateKeyDaysAgo } from '../db';
import type { InfluenceEntry, OperatorInfluenceParams } from '../domain/types';
import { INFLUENCE_THRESHOLDS as T } from './influence-thresholds';
import { oarsCompleteness, outcomeTo01 } from './influence-quality';

const ALPHA_MI = 0.15;
const ALPHA_NUDGE = 0.12;
const ALPHA_DOSE = 0.1;
const ALPHA_OPERATION = 0.08;

const DEFAULT_PARAMS: OperatorInfluenceParams = {
  id: 'influence-params',
  miDepthEma: 0.5,
  miEfficacyEma: 0.5,
  miDoseTargetWeekly: 2,
  nudgeEfficacyEma: 0.5,
  operationCalibrationAlpha: 2,
  operationCalibrationBeta: 2,
  lastUpdated: new Date().toISOString(),
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function getInfluenceParams(): Promise<OperatorInfluenceParams> {
  const row = await db.operatorInfluenceParams.get('influence-params');
  return row ?? { ...DEFAULT_PARAMS, lastUpdated: new Date().toISOString() };
}

export async function saveInfluenceParams(
  patch: Partial<Omit<OperatorInfluenceParams, 'id'>>
): Promise<OperatorInfluenceParams> {
  const current = await getInfluenceParams();
  const next: OperatorInfluenceParams = {
    ...current,
    ...patch,
    id: 'influence-params',
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorInfluenceParams.put(next);
  return next;
}

async function refreshMiDoseTarget(current: OperatorInfluenceParams): Promise<number> {
  const since = dateKeyDaysAgo(6);
  const miCount = await db.influenceEntries
    .where('date')
    .aboveOrEqual(since)
    .filter((e) => e.type === 'mi')
    .count();
  const weekly = miCount;
  return Math.max(
    T.miDoseWeeklyMin,
    Math.min(
      T.miDoseWeeklyMax,
      (1 - ALPHA_DOSE) * current.miDoseTargetWeekly + ALPHA_DOSE * weekly
    )
  );
}

export async function updateInfluenceParamsFromMi(
  entry: InfluenceEntry
): Promise<OperatorInfluenceParams> {
  const current = await getInfluenceParams();
  const depth = oarsCompleteness(entry);
  const outcomeSignal = outcomeTo01(entry.outcome);

  const miDepthEma = clamp01((1 - ALPHA_MI) * current.miDepthEma + ALPHA_MI * depth);
  const miEfficacyEma =
    outcomeSignal == null
      ? current.miEfficacyEma
      : clamp01((1 - ALPHA_MI) * current.miEfficacyEma + ALPHA_MI * outcomeSignal);

  const miDoseTargetWeekly = await refreshMiDoseTarget(current);

  return saveInfluenceParams({ miDepthEma, miEfficacyEma, miDoseTargetWeekly });
}

export async function updateInfluenceParamsFromNudge(
  entry: InfluenceEntry
): Promise<OperatorInfluenceParams> {
  const current = await getInfluenceParams();
  const outcomeSignal = outcomeTo01(entry.outcome);
  if (outcomeSignal == null) return current;

  const nudgeEfficacyEma = clamp01(
    (1 - ALPHA_NUDGE) * current.nudgeEfficacyEma + ALPHA_NUDGE * outcomeSignal
  );
  return saveInfluenceParams({ nudgeEfficacyEma });
}

export async function updateInfluenceParamsFromDebrief(
  entry: InfluenceEntry
): Promise<OperatorInfluenceParams> {
  const current = await getInfluenceParams();
  const outcomeSignal = outcomeTo01(entry.outcome);
  if (outcomeSignal == null) return current;

  const miEfficacyEma = clamp01(
    (1 - ALPHA_MI) * current.miEfficacyEma + ALPHA_MI * outcomeSignal
  );
  return saveInfluenceParams({ miEfficacyEma });
}

export async function updateInfluenceParamsFromOperationOutcome(
  success: boolean
): Promise<OperatorInfluenceParams> {
  const current = await getInfluenceParams();
  let alpha = current.operationCalibrationAlpha;
  let beta = current.operationCalibrationBeta;
  if (success) alpha += 1;
  else beta += 1;

  const calibration = alpha / (alpha + beta);
  const miEfficacyEma = clamp01(
    (1 - ALPHA_OPERATION) * current.miEfficacyEma +
      ALPHA_OPERATION * calibration
  );

  return saveInfluenceParams({
    operationCalibrationAlpha: alpha,
    operationCalibrationBeta: beta,
    miEfficacyEma,
  });
}

export async function updateInfluenceParamsFromEntry(
  entry: InfluenceEntry
): Promise<OperatorInfluenceParams> {
  switch (entry.type) {
    case 'mi':
      return updateInfluenceParamsFromMi(entry);
    case 'nudge':
      return updateInfluenceParamsFromNudge(entry);
    case 'debrief':
    case 'observation':
      return updateInfluenceParamsFromDebrief(entry);
    default:
      return getInfluenceParams();
  }
}
