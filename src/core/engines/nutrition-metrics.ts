import { db, dateKeyDaysAgo, todayKey, uid } from '@/core/db';
import type { NutritionDay, ReadinessScores } from '@/core/domain/types';
import type { MealSlot } from '@/core/domain/nutrition-types';
import { getActiveGoal } from './nutrition-goal-engine';
import {
  getNutritionParams,
  isNutritionColdStart,
  proteinZScore,
} from './nutrition-params';
import { NUTRITION_THRESHOLDS as T } from './nutrition-thresholds';

export async function getTodayNutritionDay(): Promise<NutritionDay | undefined> {
  return db.nutritionDays.where('date').equals(todayKey()).first();
}

async function loadNutritionDaysInRange(fromKey: string, toKey: string): Promise<NutritionDay[]> {
  const rows = await db.nutritionDays
    .where('date')
    .between(fromKey, toKey, true, true)
    .toArray();
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export async function aggregateDay(date: string): Promise<NutritionDay> {
  const entries = await db.mealEntries.where('date').equals(date).toArray();
  const existing = await db.nutritionDays.where('date').equals(date).first();

  let calories = 0;
  let protein = 0;
  let fats = 0;
  let carbs = 0;
  const completedIds: string[] = [];

  for (const e of entries) {
    if (!e.completed) continue;
    completedIds.push(e.id);
    calories += e.calories ?? 0;
    protein += e.protein ?? 0;
    fats += e.fats ?? 0;
    carbs += e.carbs ?? 0;
  }

  const goal = await getActiveGoal();
  const proteinTarget =
    goal?.targetProtein && goal.targetProtein > 0
      ? goal.targetProtein
      : T.defaultProteinTarget;
  const proteinRatio = protein / proteinTarget;
  const calTarget =
    goal?.targetCalories && goal.targetCalories > 0
      ? goal.targetCalories
      : T.defaultCalorieTarget;

  const day: NutritionDay = {
    id: existing?.id ?? `nd-${date}`,
    date,
    mealEntryIds: completedIds,
    completed: entries.length > 0 && entries.every((e) => e.completed),
    calories,
    protein,
    fats,
    carbs,
    recoveryScore: Math.min(
      100,
      Math.round(proteinRatio * 60 + (existing?.recoveryScore ?? 40) * 0.4)
    ),
    energyScore: Math.min(100, Math.round((calories / calTarget) * 80)),
  };

  await db.nutritionDays.put(day);
  return day;
}

export async function deriveNutritionOk(date: string): Promise<boolean> {
  const day = await db.nutritionDays.where('date').equals(date).first();
  const goal = await getActiveGoal();
  if (!day || !goal || goal.targetProtein <= 0) return false;

  const completedCount = await db.mealEntries
    .where('date')
    .equals(date)
    .toArray()
    .then((rows) => rows.filter((e) => e.completed).length);

  const proteinOk = day.protein >= goal.targetProtein * T.proteinOkRatio;
  const calLo = goal.targetCalories * T.calBandLow;
  const calHi = goal.targetCalories * T.calBandHigh;
  const calOk = day.calories >= calLo && day.calories <= calHi;
  return (
    proteinOk ||
    (calOk && completedCount >= T.minCompletedMealsForCalOk)
  );
}

export async function syncDailyLogNutrition(date: string): Promise<void> {
  const ok = await deriveNutritionOk(date);
  const existing = await db.dailyLogs.where('date').equals(date).first();
  if (existing) {
    await db.dailyLogs.update(existing.id, { nutritionOk: ok });
    return;
  }
  await db.dailyLogs.add({
    id: uid(),
    date,
    nutritionOk: ok,
  });
}

export async function getNutritionStreak(): Promise<number> {
  const goal = await getActiveGoal();
  if (!goal || goal.targetProtein <= 0) return 0;

  const from = dateKeyDaysAgo(29);
  const to = todayKey();
  const days = await loadNutritionDaysInRange(from, to);
  const byDate = new Map(days.map((d) => [d.date, d]));

  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    const day = byDate.get(key);
    if (day && day.protein >= goal.targetProtein * T.proteinOkRatio) streak++;
    else break;
  }
  return streak;
}

export async function getConsistencyScore(days = 7): Promise<number> {
  const goal = await getActiveGoal();
  if (!goal || goal.targetProtein <= 0) return 0;

  const from = dateKeyDaysAgo(days - 1);
  const to = todayKey();
  const rows = await loadNutritionDaysInRange(from, to);
  const byDate = new Map(rows.map((d) => [d.date, d]));

  let hits = 0;
  for (let d = 0; d < days; d++) {
    const key = dateKeyDaysAgo(d);
    const day = byDate.get(key);
    if (day && day.protein >= goal.targetProtein * T.proteinConsistencyRatio) hits++;
  }
  return Math.round((hits / days) * 100);
}

export interface NutritionOpsSummary {
  streak: number;
  consistency7d: number;
  proteinToday: number;
  proteinTarget: number;
  proteinGap: number;
  caloriesToday: number;
  calorieTarget: number;
  adherenceEma: number;
  proteinBaselineEma: number;
  proteinZToday: number | null;
  coldStart: boolean;
  goalType: string | null;
}

export async function getNutritionOpsSummary(): Promise<NutritionOpsSummary> {
  const goal = await getActiveGoal();
  const params = await getNutritionParams();
  const today = await getTodayNutritionDay();
  const proteinTarget = goal?.targetProtein ?? T.defaultProteinTarget;
  const calorieTarget = goal?.targetCalories ?? T.defaultCalorieTarget;
  const proteinToday = today?.protein ?? 0;

  return {
    streak: await getNutritionStreak(),
    consistency7d: await getConsistencyScore(7),
    proteinToday,
    proteinTarget,
    proteinGap: Math.max(0, proteinTarget - proteinToday),
    caloriesToday: today?.calories ?? 0,
    calorieTarget,
    adherenceEma: params.adherenceEma,
    proteinBaselineEma: params.proteinBaselineEma,
    proteinZToday: proteinZScore(proteinToday, params),
    coldStart: await isNutritionColdStart(),
    goalType: goal?.goalType ?? null,
  };
}

export interface NutritionDirective {
  calculationLine: string;
  actionLine: string;
  denyLine?: string;
}

function inferNextSlot(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

export async function buildNutritionDirective(
  readiness?: ReadinessScores
): Promise<NutritionDirective> {
  const { computeReadiness } = await import('./readiness');
  const r = readiness ?? (await computeReadiness());
  const ops = await getNutritionOpsSummary();
  const params = await getNutritionParams();
  const slotNext = inferNextSlot(new Date().getHours());

  const calcParts = [
    ops.coldStart ? 'cold_start' : `adherence_ema=${ops.adherenceEma.toFixed(2)}`,
    `protein_gap=${ops.proteinGap}g`,
    `consistency_7d=${ops.consistency7d}%`,
    ops.proteinZToday != null ? `z_protein=${ops.proteinZToday.toFixed(2)}` : null,
    ops.goalType ? `goal=${ops.goalType}` : null,
    `slot_next=${slotNext}`,
    `foundation=${r.foundation}`,
  ].filter(Boolean);

  let action = `Слот ${slotNext}: закрыть nutrition.log; цель +${ops.proteinGap}g белка (тег high_protein).`;
  if (ops.adherenceEma < T.adherenceLow) {
    action = `Упростить план: minimal_cook + cheap; ${params.loggingDoseTargetMeals.toFixed(1)} приёма/день (nutrition.log).`;
  } else if (ops.proteinGap > T.proteinGapHigh) {
    action = `Приоритет белка: ${slotNext} +${ops.proteinGap}g; snack до 16:00 если обед пропущен.`;
  } else if (ops.proteinGap > 0) {
    action = `${slotNext}: добрать ${ops.proteinGap}g белка; taskKey nutrition.log.`;
  } else {
    action = `Макросы в норме; поддерживать план (nutrition.plan).`;
  }

  let denyLine: string | undefined;
  if (r.foundation < T.foundationThrottleBelow && ops.goalType === 'cut') {
    denyLine = '[ОТКАЗ] Не углублять дефицит: foundation<45 — приоритет recovery и белок ≥ цели.';
  } else if (r.regulation < T.regulationThrottleBelow && ops.proteinGap > T.proteinGapHigh) {
    denyLine = '[ОТКАЗ] Регуляция просела: только простые приёмы (minimal_cook), без жёсткого дефицита.';
  }

  return {
    calculationLine: `[РАСЧЁТ] ${calcParts.join(' · ')}`,
    actionLine: `[ДЕЙСТВИЕ] ${action}`,
    denyLine,
  };
}

export function formatNutritionDirectiveForPrompt(d: NutritionDirective): string {
  return [d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n');
}

export async function maybeCompleteNutritionReview(date: string): Promise<void> {
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  if (dayOfWeek !== 0) return;
  const goal = await getActiveGoal();
  if (!goal) return;

  const from = dateKeyDaysAgo(6);
  const days = await loadNutritionDaysInRange(from, date);
  const loggedDays = days.filter((d) => d.protein > 0).length;
  if (loggedDays < T.reviewMinLoggedDays7d) return;

  const { completeByTaskKey } = await import('../kernel/commands/complete');
  const { TASK_KEYS } = await import('@/content/task-keys');
  await completeByTaskKey(TASK_KEYS.nutritionReview, date, 'nutrition');
}
