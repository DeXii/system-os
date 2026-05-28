import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import type { Dish, NutritionPlanState } from '@/core/domain/nutrition-types';
import { db } from '@/core/db';
import {
  diffCalendarDays,
  getCurrentPlanDayIndex,
  getMealCompletionBySlot,
  getPlannedMacrosForSlot,
  getPlanStartDateKey,
  toggleMealSlot,
} from './meal-log-service';

const plan: NutritionPlanState = {
  id: 'p1',
  planId: 'operator_maintain',
  title: 'Test',
  createdAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:00:00.000Z',
  days: Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    meals: [
      {
        slot: 'breakfast',
        dishIds: ['bf_test'],
      },
      { slot: 'lunch', dishIds: ['ln_test'] },
      { slot: 'dinner', dishIds: ['dn_test'] },
      { slot: 'snack', dishIds: ['sn_test'] },
    ],
  })),
};

const dish: Dish = {
  id: 'bf_test',
  name: 'Test breakfast',
  servings: 1,
  ingredients: [
    { ingredientId: 'eggs', amount: 3, unit: 'pcs' },
    { ingredientId: 'buckwheat', amount: 80, unit: 'g' },
  ],
  totalCalories: 400,
  totalProtein: 30,
  totalFats: 10,
  totalCarbs: 40,
  tags: ['breakfast'],
  primaryTags: ['breakfast'],
  source: 'curated',
  region: 'ru',
};

describe('meal-log-service', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    await db.close();
  });

  it('diffCalendarDays counts local calendar days', () => {
    expect(diffCalendarDays('2026-05-20', '2026-05-20')).toBe(0);
    expect(diffCalendarDays('2026-05-20', '2026-05-21')).toBe(1);
  });

  it('getCurrentPlanDayIndex cycles weekly', () => {
    const start = getPlanStartDateKey(plan);
    expect(start).toBe('2026-05-20');
    expect(getCurrentPlanDayIndex(plan, '2026-05-20')).toBe(0);
    expect(getCurrentPlanDayIndex(plan, '2026-05-21')).toBe(1);
    expect(getCurrentPlanDayIndex(plan, '2026-05-27')).toBe(0);
  });

  it('getPlannedMacrosForSlot sums dish macros', () => {
    const dishes = new Map([[dish.id, dish]]);
    const macros = getPlannedMacrosForSlot(plan, dishes, 0, 'breakfast');
    expect(macros.calories).toBe(400);
    expect(macros.protein).toBe(30);
  });

  it('getMealCompletionBySlot uses latest entry when duplicates exist', async () => {
    const date = '2099-01-15';
    await db.mealEntries.bulkPut([
      {
        id: '1000-breakfast',
        date,
        slot: 'breakfast',
        completed: true,
        calories: 100,
        protein: 10,
      },
      {
        id: '9000-breakfast',
        date,
        slot: 'breakfast',
        completed: false,
        calories: 0,
        protein: 0,
      },
    ]);
    const map = await getMealCompletionBySlot(date);
    expect(map.breakfast).toBe(false);
    await db.mealEntries.where('date').equals(date).delete();
  });

  it('toggleMealSlot clears all duplicate completed rows', async () => {
    const date = '2099-01-16';
    await db.mealEntries.bulkPut([
      { id: 'bf-1', date, slot: 'breakfast', completed: true, calories: 50, protein: 5 },
      { id: 'bf-2', date, slot: 'breakfast', completed: true, calories: 50, protein: 5 },
    ]);
    await toggleMealSlot(date, 'breakfast', 0);
    const map = await getMealCompletionBySlot(date);
    expect(map.breakfast).toBe(false);
    const remaining = await db.mealEntries.where('date').equals(date).toArray();
    expect(remaining.filter((e) => e.slot === 'breakfast')).toHaveLength(1);
    await db.mealEntries.where('date').equals(date).delete();
  });
});
