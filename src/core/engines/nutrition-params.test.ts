import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { getNutritionParams, updateNutritionParamsFromDay } from './nutrition-params';

describe('nutrition-params', () => {
  beforeEach(async () => {
    await db.open();
    await db.operatorNutritionParams.clear();
    await db.nutritionGoals.clear();
  });

  it('updates adherence EMA from day aggregate', async () => {
    const goal = {
      id: 'g1',
      targetCalories: 2200,
      targetProtein: 120,
      targetFats: 70,
      targetCarbs: 250,
      goalType: 'maintain' as const,
      active: true,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };
    await db.nutritionGoals.add(goal);

    const day = {
      id: 'nd-1',
      date: '2026-05-30',
      mealEntryIds: ['m1'],
      completed: true,
      calories: 1800,
      protein: 96,
      fats: 60,
      carbs: 200,
    };
    const next = await updateNutritionParamsFromDay(day, goal);
    expect(next.adherenceEma).toBeGreaterThan(0);
    expect(next.proteinBaselineEma).toBe(96);

    const persisted = await getNutritionParams();
    expect(persisted.adherenceEma).toBe(next.adherenceEma);
  });
});
