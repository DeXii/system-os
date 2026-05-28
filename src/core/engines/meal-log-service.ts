import { db, todayKey } from '@/core/db';
import type {
  Dish,
  MealEntry,
  MealSlot,
  NutritionPlanState,
} from '@/core/domain/nutrition-types';
import { getDayMenu, getActivePlanState } from '@/core/engines/meal-planning-engine';
import { aggregateDay, syncDailyLogNutrition } from '@/core/engines/nutrition-metrics';
import { TASK_KEYS } from '@/content/task-keys';
import { completeByTaskKey } from '@/core/kernel/commands/complete';
import { afterMealLogged } from '@/core/kernel/automations/after-nutrition';
import { afterFactWrite } from '@/core/kernel/pipeline';

export interface MealMacros {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar days from `fromKey` to `toKey` (local dates). */
export function diffCalendarDays(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function getPlanStartDateKey(plan: NutritionPlanState): string {
  return plan.createdAt.slice(0, 10);
}

/** Cyclic day index 0..days.length-1 from plan start. */
export function getCurrentPlanDayIndex(
  plan: NutritionPlanState,
  today: string = todayKey()
): number {
  const len = plan.days.length || 7;
  const start = getPlanStartDateKey(plan);
  const diff = Math.max(0, diffCalendarDays(start, today));
  return diff % len;
}

export function getPlannedMacrosForSlot(
  plan: NutritionPlanState,
  dishes: Map<string, Dish>,
  planDayIndex: number,
  slot: MealSlot
): MealMacros {
  const menu = getDayMenu(plan, planDayIndex, dishes);
  const row = menu.find((m) => m.meal.slot === slot);
  if (!row) return { calories: 0, protein: 0, fats: 0, carbs: 0 };

  let calories = 0;
  let protein = 0;
  let fats = 0;
  let carbs = 0;
  for (const d of row.dishes) {
    calories += d.totalCalories ?? 0;
    protein += d.totalProtein ?? 0;
    fats += d.totalFats ?? 0;
    carbs += d.totalCarbs ?? 0;
  }
  return { calories, protein, fats, carbs };
}

export function getPlannedMealLabel(
  plan: NutritionPlanState,
  dishes: Map<string, Dish>,
  planDayIndex: number,
  slot: MealSlot
): string | null {
  const menu = getDayMenu(plan, planDayIndex, dishes);
  const row = menu.find((m) => m.meal.slot === slot);
  if (!row?.dishes.length) return null;
  return row.dishes.map((d) => d.name).join(' + ');
}

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Latest entry per slot wins (ids are time-ordered). */
export async function getMealCompletionBySlot(
  date: string
): Promise<Record<MealSlot, boolean>> {
  const entries = await db.mealEntries.where('date').equals(date).toArray();
  const result: Record<MealSlot, boolean> = {
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  };
  for (const slot of MEAL_SLOTS) {
    const slotEntries = entries
      .filter((e) => e.slot === slot)
      .sort((a, b) => b.id.localeCompare(a.id));
    if (slotEntries.length) result[slot] = !!slotEntries[0].completed;
  }
  return result;
}

/** Keep one row per slot (newest id); delete duplicates. */
async function dedupeMealEntriesForSlot(
  date: string,
  slot: MealSlot
): Promise<MealEntry | undefined> {
  const slotEntries = (await db.mealEntries.where('date').equals(date).toArray())
    .filter((e) => e.slot === slot)
    .sort((a, b) => b.id.localeCompare(a.id));
  const keep = slotEntries[0];
  for (let i = 1; i < slotEntries.length; i++) {
    await db.mealEntries.delete(slotEntries[i].id);
  }
  return keep;
}

export function collectIngredientIdsForPlanDay(
  plan: NutritionPlanState,
  dishes: Map<string, Dish>,
  planDayIndex: number
): Set<string> {
  const ids = new Set<string>();
  const menu = getDayMenu(plan, planDayIndex, dishes);
  for (const { dishes: mealDishes } of menu) {
    for (const dish of mealDishes) {
      for (const di of dish.ingredients) {
        if (!di.optional && di.ingredientId) ids.add(di.ingredientId);
      }
    }
  }
  return ids;
}

export async function toggleMealSlot(
  date: string,
  slot: MealSlot,
  planDayIndex?: number
): Promise<void> {
  const plan = await getActivePlanState();
  const dishRows = await db.dishes.toArray();
  const dishes = new Map(dishRows.map((d) => [d.id, d]));

  const dayIdx =
    planDayIndex ??
    (plan ? getCurrentPlanDayIndex(plan, date) : 0);

  const all = await db.mealEntries.where('date').equals(date).toArray();
  const forSlot = all.filter((e) => e.slot === slot);
  const anyCompleted = forSlot.some((e) => e.completed);

  if (anyCompleted) {
    for (const e of forSlot) {
      await db.mealEntries.update(e.id, {
        completed: false,
        calories: 0,
        protein: 0,
        fats: 0,
        carbs: 0,
      });
    }
    await dedupeMealEntriesForSlot(date, slot);
    await aggregateDay(date);
    await syncDailyLogNutrition(date);
    await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'meal_unlogged' });
    return;
  }

  const macros =
    plan != null
      ? getPlannedMacrosForSlot(plan, dishes, dayIdx, slot)
      : { calories: 0, protein: 0, fats: 0, carbs: 0 };

  const canonical = await dedupeMealEntriesForSlot(date, slot);

  if (canonical) {
    await db.mealEntries.update(canonical.id, {
      completed: true,
      calories: macros.calories,
      protein: macros.protein,
      fats: macros.fats,
      carbs: macros.carbs,
    });
    await aggregateDay(date);
    await syncDailyLogNutrition(date);
    await completeByTaskKey(TASK_KEYS.nutritionLog, date, 'nutrition');
    await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'meal_logged' });
    return;
  }

  await afterMealLogged({
    date,
    slot,
    completed: true,
    ...macros,
  });
  await dedupeMealEntriesForSlot(date, slot);
}
