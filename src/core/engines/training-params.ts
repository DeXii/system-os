import { getCatalogExerciseById } from '@/content/exercises';
import { db, todayKey } from '../db';
import type { OperatorTrainingParams, SetLog } from '../domain/types';
import { deriveNutritionOk } from './nutrition-metrics';
import { getFoundationLoadModifiers } from './foundation-load';
import { setSucceeded } from './progression-engine';

export function sessionPerformanceFromLogs(logs: SetLog[]): number {
  if (!logs.length) return 0.5;
  const rates = logs.map((l) => {
    const target = l.targetSeconds ?? l.targetReps;
    const actual = l.actualSeconds ?? l.actualReps;
    if (!target) return setSucceeded(l) ? 1 : 0;
    return Math.min(1.2, actual / target);
  });
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

export function patternStrengthKey(exerciseId: string): 'strengthPull' | 'strengthPush' | null {
  const ex = getCatalogExerciseById(exerciseId);
  if (!ex) return null;
  if (ex.pattern === 'pull') return 'strengthPull';
  if (ex.pattern === 'push') return 'strengthPush';
  return null;
}

const DEFAULT_PARAMS: OperatorTrainingParams = {
  id: 'training-params',
  strengthPull: 0.55,
  strengthPush: 0.55,
  fatigue: 0.35,
  recoveryPrior: 0.6,
  lastUpdated: new Date().toISOString(),
};

const ALPHA_STRENGTH = 0.2;
const ALPHA_FATIGUE = 0.28;
const ALPHA_RECOVERY = 0.15;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function getTrainingParams(): Promise<OperatorTrainingParams> {
  const row = await db.operatorTrainingParams.get('training-params');
  return row ?? { ...DEFAULT_PARAMS, lastUpdated: new Date().toISOString() };
}

export async function saveTrainingParams(
  patch: Partial<Omit<OperatorTrainingParams, 'id'>>
): Promise<OperatorTrainingParams> {
  const current = await getTrainingParams();
  const next: OperatorTrainingParams = {
    ...current,
    ...patch,
    id: 'training-params',
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorTrainingParams.put(next);
  return next;
}

export async function computeRecoveryPrior(date = todayKey()): Promise<number> {
  const log = await db.dailyLogs.where('date').equals(date).first();
  let score = 0.5;
  if (log?.sleepHours != null) {
    const sleep = log.sleepHours;
    if (sleep >= 7.5) score += 0.25;
    else if (sleep >= 6) score += 0.1;
    else score -= 0.15;
  }
  if (log?.hydrationOk) score += 0.1;
  const nutritionOk = log?.nutritionOk ?? (await deriveNutritionOk(date));
  if (nutritionOk) score += 0.15;
  return clamp01(score);
}

/**
 * Online EMA update after a workout session.
 */
export async function updateTrainingParamsFromSession(
  _planId: string,
  logs: SetLog[]
): Promise<OperatorTrainingParams> {
  const current = await getTrainingParams();
  const performance = sessionPerformanceFromLogs(logs);
  const date = logs[0]?.date ?? todayKey();

  let strengthPull = current.strengthPull;
  let strengthPush = current.strengthPush;
  const pullLogs = logs.filter((l) => patternStrengthKey(l.exerciseId) === 'strengthPull');
  const pushLogs = logs.filter((l) => patternStrengthKey(l.exerciseId) === 'strengthPush');

  if (pullLogs.length) {
    const perf = sessionPerformanceFromLogs(pullLogs);
    strengthPull = clamp01((1 - ALPHA_STRENGTH) * strengthPull + ALPHA_STRENGTH * perf);
  }
  if (pushLogs.length) {
    const perf = sessionPerformanceFromLogs(pushLogs);
    strengthPush = clamp01((1 - ALPHA_STRENGTH) * strengthPush + ALPHA_STRENGTH * perf);
  }

  if (!pullLogs.length && !pushLogs.length && logs.length) {
    const patterns = new Set(
      logs.map((l) => getCatalogExerciseById(l.exerciseId)?.pattern).filter(Boolean)
    );
    if (patterns.has('pull')) {
      strengthPull = clamp01((1 - ALPHA_STRENGTH) * strengthPull + ALPHA_STRENGTH * performance);
    }
    if (patterns.has('push')) {
      strengthPush = clamp01((1 - ALPHA_STRENGTH) * strengthPush + ALPHA_STRENGTH * performance);
    }
  }

  const failRate = logs.length
    ? logs.filter((l) => !setSucceeded(l)).length / logs.length
    : 0;
  const rpeSignal = logs.some((l) => l.rpe != null && l.rpe >= 8) ? 0.12 : 0;
  const fatigueSignal = (1 - performance) * 0.5 + failRate * 0.3 + rpeSignal;
  const fatigue = clamp01((1 - ALPHA_FATIGUE) * current.fatigue + ALPHA_FATIGUE * fatigueSignal);

  const recoveryPrior = clamp01(
    (1 - ALPHA_RECOVERY) * current.recoveryPrior + ALPHA_RECOVERY * (await computeRecoveryPrior(date))
  );

  const hour = new Date().getHours();
  const chronotypePeakHour =
    current.chronotypePeakHour == null
      ? hour
      : Math.round((1 - 0.05) * current.chronotypePeakHour + 0.05 * hour);

  return saveTrainingParams({
    strengthPull,
    strengthPush,
    fatigue,
    recoveryPrior,
    chronotypePeakHour,
  });
}

export interface SessionLoadSuggestion {
  sets: number;
  repFactor: number;
  volumeMultiplier: number;
}

export async function suggestSessionLoad(
  kind: import('../domain/types').WorkoutKind
): Promise<SessionLoadSuggestion> {
  const params = await getTrainingParams();
  const mods = await getFoundationLoadModifiers();
  const baseSets = 3;
  const strength =
    kind === 'hift' || kind.startsWith('gpp_pull')
      ? params.strengthPull
      : kind.startsWith('gpp_push')
        ? params.strengthPush
        : (params.strengthPull + params.strengthPush) / 2;
  const volumeMultiplier =
    mods.volumeMultiplier * params.recoveryPrior * (0.85 + 0.15 * strength);
  const sets = Math.max(2, Math.min(5, Math.round(baseSets * volumeMultiplier)));
  const repFactor = Math.max(0.85, Math.min(1.05, 0.9 + 0.1 * strength));
  return { sets, repFactor, volumeMultiplier };
}
