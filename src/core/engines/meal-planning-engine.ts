import { db, uid } from '@/core/db';
import { getMealPlanTemplate } from '@/content/nutrition/meal-plans';
import { CURATED_DISHES } from '@/content/nutrition/ayanokoji';
import type {
  Dish,
  DishTag,
  MealPlanTemplate,
  NutritionPlanState,
  PlannedMeal,
} from '@/core/domain/nutrition-types';
import { getDishesByTags } from '@/core/nutrition/data/local-search-index';
import { getPlannedMealDishIds, mealSwapKey } from '@/core/nutrition/meal-ids';
import { getActiveGoal, getBodyMetrics } from '@/core/engines/nutrition-goal-engine';
import {
  defaultGoalForTemplate,
  generateWeekPlan,
} from '@/core/engines/meal-composer';

export async function applyMealPlanTemplate(templateId: string): Promise<NutritionPlanState> {
  const template = getMealPlanTemplate(templateId);
  if (!template) throw new Error('Шаблон плана не найден');

  const storedDishes = await db.dishes.toArray();
  const dishes = storedDishes.length ? storedDishes : CURATED_DISHES;
  const goal = (await getActiveGoal()) ?? defaultGoalForTemplate(template, await getBodyMetrics());

  const days =
    template.days.length > 0
      ? template.days.map((d) => ({
          dayIndex: d.dayIndex,
          meals: d.meals.map((m) => ({
            slot: m.slot,
            dishIds: m.dishIds ?? (m.dishId ? [m.dishId] : []),
          })),
        }))
      : generateWeekPlan(template, goal, dishes, template.daysCount);

  const now = new Date().toISOString();
  const state: NutritionPlanState = {
    id: uid(),
    planId: template.id,
    title: template.name,
    days,
    updatedAt: now,
    createdAt: now,
  };

  await db.nutritionPlanState.put(state);
  return state;
}

export async function getActivePlanState(): Promise<NutritionPlanState | undefined> {
  const rows = await db.nutritionPlanState.toArray();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function getDayMenu(
  state: NutritionPlanState,
  dayIndex: number,
  dishes: Map<string, Dish>
): { meal: PlannedMeal; dishIds: string[]; dishes: Dish[] }[] {
  const day = state.days.find((d) => d.dayIndex === dayIndex);
  if (!day) return [];
  return day.meals.map((meal) => {
    const dishIds = getPlannedMealDishIds(meal, state, dayIndex);
    const resolved = dishIds.map((id) => dishes.get(id)).filter((d): d is Dish => !!d);
    return { meal: { ...meal, dishIds }, dishIds, dishes: resolved };
  });
}

export async function swapMeal(
  stateId: string,
  dayIndex: number,
  slot: PlannedMeal['slot'],
  newDishIds: string[]
): Promise<NutritionPlanState> {
  const state = await db.nutritionPlanState.get(stateId);
  if (!state) throw new Error('План не найден');
  const key = mealSwapKey(dayIndex, slot);
  const mealSwaps = { ...state.mealSwaps, [key]: newDishIds };
  const updated: NutritionPlanState = {
    ...state,
    mealSwaps,
    updatedAt: new Date().toISOString(),
  };
  await db.nutritionPlanState.put(updated);
  return updated;
}

/** @deprecated use swapMeal */
export async function swapDish(
  stateId: string,
  dayIndex: number,
  slot: PlannedMeal['slot'],
  newDishId: string
): Promise<NutritionPlanState> {
  return swapMeal(stateId, dayIndex, slot, [newDishId]);
}

export function pickDishForSlot(
  template: MealPlanTemplate,
  dishes: Dish[],
  dayIndex: number,
  slotIndex: number
): string | undefined {
  const pool = getDishesByTags(dishes, template.requiredTags);
  if (!pool.length) return dishes[dayIndex % dishes.length]?.id;
  const preferred = template.preferredTags?.length
    ? pool.filter((d) => template.preferredTags!.some((t) => d.tags.includes(t)))
    : pool;
  const list = preferred.length ? preferred : pool;
  return list[(dayIndex + slotIndex) % list.length]?.id;
}

export function planNeedsRecalc(
  plan: NutritionPlanState,
  listUpdatedAt?: string
): boolean {
  if (!listUpdatedAt) return false;
  return plan.updatedAt > listUpdatedAt;
}

export function findMealSwap(
  dishes: Dish[],
  current: Dish,
  requiredTags: DishTag[],
  tolerance = 0.05
): Dish | undefined {
  const pool = dishes.filter(
    (d) =>
      d.id !== current.id &&
      requiredTags.every((t) => d.tags.includes(t)) &&
      Math.abs((d.totalProtein ?? 0) - (current.totalProtein ?? 0)) <=
        (current.totalProtein ?? 1) * tolerance
  );
  return pool[0];
}
