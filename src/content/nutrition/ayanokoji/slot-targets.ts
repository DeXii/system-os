import type { MealSlot, NutritionGoal } from '@/core/domain/nutrition-types';

export interface SlotMacroTargets {
  calories: number;
  protein: number;
  proteinMin: number;
  proteinMax: number;
  caloriesMin: number;
  caloriesMax: number;
}

/** Daily calorie/protein split by slot (Ayanokoji-style stable energy). */
const SLOT_CAL_SHARE: Record<MealSlot, number> = {
  breakfast: 0.22,
  lunch: 0.33,
  dinner: 0.28,
  snack: 0.17,
};

const SLOT_PROTEIN_SHARE: Record<MealSlot, number> = {
  breakfast: 0.22,
  lunch: 0.32,
  dinner: 0.28,
  snack: 0.18,
};

/** Absolute protein bounds per slot (g). */
const SLOT_PROTEIN_BOUNDS: Record<MealSlot, { min: number; max: number }> = {
  breakfast: { min: 25, max: 40 },
  lunch: { min: 30, max: 50 },
  dinner: { min: 30, max: 40 },
  snack: { min: 15, max: 25 },
};

export function computeSlotTargets(goal: NutritionGoal): Record<MealSlot, SlotMacroTargets> {
  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const out = {} as Record<MealSlot, SlotMacroTargets>;
  for (const slot of slots) {
    const cal = Math.round(goal.targetCalories * SLOT_CAL_SHARE[slot]);
    const protein = Math.round(goal.targetProtein * SLOT_PROTEIN_SHARE[slot]);
    const bounds = SLOT_PROTEIN_BOUNDS[slot];
    out[slot] = {
      calories: cal,
      protein,
      proteinMin: bounds.min,
      proteinMax: bounds.max,
      caloriesMin: Math.round(cal * 0.85),
      caloriesMax: Math.round(cal * 1.15),
    };
  }
  return out;
}

/** Macro validation ranges for catalog dishes (per serving). */
export const SLOT_DISH_RANGES: Record<
  MealSlot,
  { proteinMin: number; proteinMax: number; calMin: number; calMax: number }
> = {
  breakfast: { proteinMin: 12, proteinMax: 45, calMin: 250, calMax: 650 },
  lunch: { proteinMin: 18, proteinMax: 55, calMin: 400, calMax: 900 },
  dinner: { proteinMin: 18, proteinMax: 50, calMin: 350, calMax: 800 },
  snack: { proteinMin: 8, proteinMax: 30, calMin: 120, calMax: 400 },
};
