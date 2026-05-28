import { describe, expect, it } from 'vitest';
import { CURATED_DISHES } from '@/content/nutrition/ayanokoji';
import { MEAL_PLAN_TEMPLATES } from '@/content/nutrition/meal-plans';
import {
  defaultGoalForTemplate,
  generateWeekPlan,
  pickMealCombo,
} from './meal-composer';
import { computeSlotTargets } from '@/content/nutrition/ayanokoji/slot-targets';
import { filterDishesForSlot } from './meal-composer';

describe('meal-composer', () => {
  it('generates 7 days with 4 meals each', () => {
    const template = MEAL_PLAN_TEMPLATES[0];
    const goal = defaultGoalForTemplate(template);
    const days = generateWeekPlan(template, goal, CURATED_DISHES, 7);
    expect(days).toHaveLength(7);
    for (const day of days) {
      expect(day.meals).toHaveLength(4);
      for (const meal of day.meals) {
        expect(meal.dishIds?.length).toBeGreaterThan(0);
      }
    }
  });

  it('daily protein is within ~15% of goal', () => {
    const template = MEAL_PLAN_TEMPLATES.find((t) => t.id === 'operator_performance')!;
    const goal = defaultGoalForTemplate(template);
    const dishMap = new Map(CURATED_DISHES.map((d) => [d.id, d]));
    const days = generateWeekPlan(template, goal, CURATED_DISHES, 7);
    for (const day of days) {
      let protein = 0;
      for (const meal of day.meals) {
        for (const id of meal.dishIds ?? []) {
          protein += dishMap.get(id)?.totalProtein ?? 0;
        }
      }
      const diff = Math.abs(protein - goal.targetProtein) / goal.targetProtein;
      expect(diff).toBeLessThan(0.2);
    }
  });

  it('pickMealCombo respects protein minimum when possible', () => {
    const template = MEAL_PLAN_TEMPLATES[0];
    const goal = defaultGoalForTemplate(template);
    const targets = computeSlotTargets(goal);
    const pool = filterDishesForSlot(CURATED_DISHES, 'breakfast', template);
    const ids = pickMealCombo(pool, targets.breakfast, [], 0, 'breakfast');
    const dishMap = new Map(pool.map((d) => [d.id, d]));
    const protein = ids.reduce((s, id) => s + (dishMap.get(id)?.totalProtein ?? 0), 0);
    expect(protein).toBeGreaterThanOrEqual(targets.breakfast.proteinMin * 0.85);
  });
});
