import { db, dateKeyDaysAgo } from '../db';
import type { NutritionDay, NutritionGoal, OperatorNutritionParams } from '../domain/types';
import { NUTRITION_THRESHOLDS as T } from './nutrition-thresholds';

const ALPHA_ADHERENCE = 0.1;
const ALPHA_MACRO = 0.08;
const ALPHA_DOSE = 0.1;

const DEFAULT_PARAMS: OperatorNutritionParams = {
  id: 'nutrition-params',
  proteinBaselineEma: 0,
  calorieBaselineEma: 0,
  proteinSigmaEma: T.proteinSigmaFloor,
  adherenceEma: 0.5,
  loggingDoseTargetMeals: 3,
  lastUpdated: new Date().toISOString(),
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function getNutritionParams(): Promise<OperatorNutritionParams> {
  const row = await db.operatorNutritionParams.get('nutrition-params');
  return row ?? { ...DEFAULT_PARAMS, lastUpdated: new Date().toISOString() };
}

export async function saveNutritionParams(
  patch: Partial<Omit<OperatorNutritionParams, 'id'>>
): Promise<OperatorNutritionParams> {
  const current = await getNutritionParams();
  const next: OperatorNutritionParams = {
    ...current,
    ...patch,
    id: 'nutrition-params',
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorNutritionParams.put(next);
  return next;
}

export async function updateNutritionParamsFromDay(
  day: NutritionDay,
  goal: NutritionGoal
): Promise<OperatorNutritionParams> {
  const current = await getNutritionParams();
  const proteinTarget =
    goal.targetProtein > 0 ? goal.targetProtein : T.defaultProteinTarget;
  const proteinRatio = clamp01(day.protein / proteinTarget);

  const baseline =
    current.proteinBaselineEma > 0 ? current.proteinBaselineEma : day.protein;
  const dev = day.protein - baseline;
  const proteinBaselineEma =
    current.proteinBaselineEma > 0
      ? (1 - ALPHA_MACRO) * current.proteinBaselineEma + ALPHA_MACRO * day.protein
      : day.protein;
  const proteinSigmaEma = Math.max(
    T.proteinSigmaFloor,
    (1 - ALPHA_MACRO) * current.proteinSigmaEma + ALPHA_MACRO * dev * dev
  );

  const calorieBaselineEma =
    current.calorieBaselineEma > 0
      ? (1 - ALPHA_MACRO) * current.calorieBaselineEma + ALPHA_MACRO * day.calories
      : day.calories;

  const adherenceEma =
    (1 - ALPHA_ADHERENCE) * current.adherenceEma + ALPHA_ADHERENCE * proteinRatio;

  const since = dateKeyDaysAgo(6);
  const entries = (await db.mealEntries.where('date').aboveOrEqual(since).toArray()).filter(
    (e) => e.completed
  );
  const mealsByDate = new Map<string, number>();
  for (const e of entries) {
    mealsByDate.set(e.date, (mealsByDate.get(e.date) ?? 0) + 1);
  }
  const avgMeals =
    mealsByDate.size > 0
      ? [...mealsByDate.values()].reduce((a, b) => a + b, 0) / mealsByDate.size
      : current.loggingDoseTargetMeals;
  const loggingDoseTargetMeals = Math.max(
    2,
    Math.min(4, (1 - ALPHA_DOSE) * current.loggingDoseTargetMeals + ALPHA_DOSE * avgMeals)
  );

  return saveNutritionParams({
    proteinBaselineEma,
    calorieBaselineEma,
    proteinSigmaEma,
    adherenceEma,
    loggingDoseTargetMeals,
  });
}

export async function isNutritionColdStart(): Promise<boolean> {
  const since = dateKeyDaysAgo(T.coldLookbackDays);
  const entries = await db.mealEntries.where('date').aboveOrEqual(since).toArray();
  const count = entries.filter((e) => e.completed).length;
  return count === 0;
}

export function proteinZScore(
  protein: number,
  params: OperatorNutritionParams
): number | null {
  if (params.proteinBaselineEma <= 0) return null;
  const sigma = Math.sqrt(Math.max(params.proteinSigmaEma, T.proteinSigmaFloor));
  return (protein - params.proteinBaselineEma) / sigma;
}
