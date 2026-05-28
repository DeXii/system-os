import type { NutritionPlanState, PlannedMeal } from '@/core/domain/nutrition-types';

/** Resolve dish ids for a planned meal (supports legacy dishId). */
export function getPlannedMealDishIds(
  meal: PlannedMeal,
  plan: NutritionPlanState,
  dayIndex: number
): string[] {
  const key = `${dayIndex}-${meal.slot}`;
  const swapped = plan.mealSwaps?.[key];
  if (swapped?.length) return swapped;
  const legacySwap = plan.dishSwaps?.[key];
  if (legacySwap) return [legacySwap];
  if (meal.dishIds?.length) return meal.dishIds;
  if (meal.dishId) return [meal.dishId];
  return [];
}

export function mealSwapKey(dayIndex: number, slot: PlannedMeal['slot']): string {
  return `${dayIndex}-${slot}`;
}
