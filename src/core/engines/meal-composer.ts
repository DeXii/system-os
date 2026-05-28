import type {
  Dish,
  DishTag,
  MealPlanDay,
  MealPlanTemplate,
  MealSlot,
  NutritionGoal,
  OperatorBodyMetrics,
  PlannedMeal,
} from '@/core/domain/nutrition-types';
import { computeTargets } from '@/core/engines/nutrition-goal-engine';
import { computeSlotTargets, type SlotMacroTargets } from '@/content/nutrition/ayanokoji/slot-targets';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const SLOT_INDEX: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

function dishMacros(d: Dish) {
  return {
    cal: d.totalCalories ?? 0,
    protein: d.totalProtein ?? 0,
  };
}

function comboScore(
  ids: string[],
  dishes: Map<string, Dish>,
  targets: SlotMacroTargets,
  preferred: DishTag[]
): number {
  let cal = 0;
  let protein = 0;
  let prefBonus = 0;
  for (const id of ids) {
    const d = dishes.get(id);
    if (!d) return Infinity;
    const m = dishMacros(d);
    cal += m.cal;
    protein += m.protein;
    prefBonus += preferred.filter((t) => d.tags.includes(t)).length * 8;
  }
  const calDiff = Math.abs(cal - targets.calories);
  const proteinDiff =
    protein < targets.proteinMin
      ? (targets.proteinMin - protein) * 3
      : protein > targets.proteinMax
        ? (protein - targets.proteinMax) * 3
        : Math.abs(protein - targets.protein) * 1.2;
  return calDiff + proteinDiff - prefBonus;
}

const SLOT_TAGS: DishTag[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function filterDishesForSlot(
  dishes: Dish[],
  slot: MealSlot,
  template: MealPlanTemplate
): Dish[] {
  const slotTag = slot as DishTag;
  const required = template.requiredTags.filter((t) => !SLOT_TAGS.includes(t));
  let pool = dishes.filter((d) => d.tags.includes(slotTag) || d.mealSlots?.includes(slot));
  if (required.length) {
    const filtered = pool.filter((d) => required.every((t) => d.tags.includes(t)));
    if (filtered.length) pool = filtered;
  }
  return pool.length ? pool : dishes.filter((d) => d.tags.includes(slotTag));
}

export function pickMealCombo(
  pool: Dish[],
  targets: SlotMacroTargets,
  preferredTags: DishTag[],
  dayIndex: number,
  slot: MealSlot,
  maxDishes = 3
): string[] {
  if (!pool.length) return [];
  const dishMap = new Map(pool.map((d) => [d.id, d]));
  const offset = (dayIndex * 7 + SLOT_INDEX[slot] * 11) % pool.length;

  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];

  let best: string[] = [rotated[0].id];
  let bestScore = comboScore(best, dishMap, targets, preferredTags);

  for (let i = 0; i < Math.min(rotated.length, 20); i++) {
    const single = [rotated[i].id];
    const s = comboScore(single, dishMap, targets, preferredTags);
    if (s < bestScore) {
      bestScore = s;
      best = single;
    }
  }

  const first = best[0];
  const firstDish = dishMap.get(first)!;
  const firstP = dishMacros(firstDish).protein;

  if (firstP < targets.proteinMin && maxDishes > 1) {
    for (let i = 0; i < Math.min(rotated.length, 15); i++) {
      for (let j = i + 1; j < Math.min(rotated.length, 15); j++) {
        if (rotated[i].id === first || rotated[j].id === first) continue;
        const pair = [first, rotated[i].id];
        const pairScore = comboScore(pair, dishMap, targets, preferredTags);
        if (pairScore < bestScore) {
          bestScore = pairScore;
          best = pair;
        }
        if (maxDishes >= 3) {
          const triple = [first, rotated[i].id, rotated[j].id];
          const tripleScore = comboScore(triple, dishMap, targets, preferredTags);
          if (tripleScore < bestScore) {
            bestScore = tripleScore;
            best = triple;
          }
        }
      }
    }
  }

  return best;
}

export function generateWeekPlan(
  template: MealPlanTemplate,
  goal: NutritionGoal,
  allDishes: Dish[],
  daysCount = 7
): MealPlanDay[] {
  const slotTargets = computeSlotTargets(goal);
  const preferred = template.preferredTags ?? [];
  const days: MealPlanDay[] = [];

  for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
    const meals: PlannedMeal[] = SLOTS.map((slot) => {
      const pool = filterDishesForSlot(allDishes, slot, template);
      const dishIds = pickMealCombo(
        pool,
        slotTargets[slot],
        preferred,
        dayIndex,
        slot
      );
      return { slot, dishIds };
    });
    days.push({ dayIndex, meals });
  }
  return days;
}

export function defaultGoalForTemplate(
  template: MealPlanTemplate,
  body?: OperatorBodyMetrics
): NutritionGoal {
  const metrics: OperatorBodyMetrics =
    body ??
    ({
      id: 'body-metrics',
      weight: 70,
      height: 175,
      age: 28,
      sex: 'male',
      activityLevel: 'moderate',
      trainingDaysPerWeek: 3,
      updatedAt: new Date().toISOString(),
    } as OperatorBodyMetrics);

  const targets = computeTargets(metrics, template.goalType);
  const now = new Date().toISOString();
  return {
    id: 'default-goal',
    ...targets,
    goalType: template.goalType,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}
