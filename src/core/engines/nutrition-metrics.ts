import { db, dateKeyDaysAgo, todayKey, uid } from '@/core/db';
import type { NutritionDay } from '@/core/domain/nutrition-types';
import { getActiveGoal } from './nutrition-goal-engine';

export async function getTodayNutritionDay(): Promise<NutritionDay | undefined> {
  return db.nutritionDays.where('date').equals(todayKey()).first();
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
    goal?.targetProtein && goal.targetProtein > 0 ? goal.targetProtein : 100;
  const proteinRatio = protein / proteinTarget;
  const calTarget =
    goal?.targetCalories && goal.targetCalories > 0 ? goal.targetCalories : 2200;

  const day: NutritionDay = {
    id: existing?.id ?? `nd-${date}`,
    date,
    mealEntryIds: entries.map((e) => e.id),
    completed: entries.length > 0 && entries.every((e) => e.completed),
    calories,
    protein,
    fats,
    carbs,
    recoveryScore: Math.min(100, Math.round(proteinRatio * 60 + (existing?.recoveryScore ?? 40) * 0.4)),
    energyScore: Math.min(100, Math.round((calories / calTarget) * 80)),
  };

  await db.nutritionDays.put(day);
  return day;
}

export async function deriveNutritionOk(date: string): Promise<boolean> {
  const day = await db.nutritionDays.where('date').equals(date).first();
  const goal = await getActiveGoal();
  if (!day || !goal) return false;
  const proteinOk = day.protein >= goal.targetProtein * 0.8;
  const calLo = goal.targetCalories * 0.85;
  const calHi = goal.targetCalories * 1.15;
  const calOk = day.calories >= calLo && day.calories <= calHi;
  return proteinOk || (calOk && day.mealEntryIds.length >= 2);
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
  if (!goal) return 0;
  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    const day = await db.nutritionDays.where('date').equals(key).first();
    if (day && day.protein >= goal.targetProtein * 0.8) streak++;
    else break;
  }
  return streak;
}

export async function getConsistencyScore(days = 7): Promise<number> {
  const goal = await getActiveGoal();
  if (!goal) return 0;
  let hits = 0;
  for (let d = 0; d < days; d++) {
    const key = dateKeyDaysAgo(d);
    const day = await db.nutritionDays.where('date').equals(key).first();
    if (day && day.protein >= goal.targetProtein * 0.75) hits++;
  }
  return Math.round((hits / days) * 100);
}
