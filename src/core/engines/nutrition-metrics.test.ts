import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { aggregateDay, deriveNutritionOk } from './nutrition-metrics';

describe('aggregateDay', () => {
  beforeEach(async () => {
    await db.open();
    await db.nutritionGoals.clear();
    await db.mealEntries.clear();
    await db.nutritionDays.clear();
  });

  it('does not divide by zero when protein target is 0', async () => {
    await db.nutritionGoals.add({
      id: 'g1',
      targetCalories: 2200,
      targetProtein: 0,
      targetFats: 70,
      targetCarbs: 250,
      goalType: 'maintain',
      active: true,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });
    const day = await aggregateDay('2026-05-30');
    expect(Number.isFinite(day.recoveryScore)).toBe(true);
    expect(day.recoveryScore).toBeGreaterThanOrEqual(0);
  });
});

describe('deriveNutritionOk', () => {
  beforeEach(async () => {
    await db.open();
    await db.nutritionGoals.clear();
    await db.mealEntries.clear();
    await db.nutritionDays.clear();
  });

  it('returns false when protein target is 0', async () => {
    await db.nutritionGoals.add({
      id: 'g1',
      targetCalories: 2200,
      targetProtein: 0,
      targetFats: 70,
      targetCarbs: 250,
      goalType: 'maintain',
      active: true,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });
    await db.nutritionDays.add({
      id: 'nd-1',
      date: '2026-05-30',
      mealEntryIds: [],
      completed: true,
      calories: 2200,
      protein: 100,
      fats: 70,
      carbs: 250,
    });
    expect(await deriveNutritionOk('2026-05-30')).toBe(false);
  });

  it('requires completed meals for calorie-only ok path', async () => {
    await db.nutritionGoals.add({
      id: 'g1',
      targetCalories: 2000,
      targetProtein: 150,
      targetFats: 70,
      targetCarbs: 250,
      goalType: 'maintain',
      active: true,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });
    await db.nutritionDays.add({
      id: 'nd-1',
      date: '2026-05-30',
      mealEntryIds: ['m1', 'm2'],
      completed: true,
      calories: 2000,
      protein: 50,
      fats: 70,
      carbs: 250,
    });
    await db.mealEntries.bulkAdd([
      {
        id: 'm1',
        date: '2026-05-30',
        slot: 'breakfast',
        dishId: 'd1',
        completed: true,
        calories: 1000,
        protein: 25,
        fats: 30,
        carbs: 100,
      },
      {
        id: 'm2',
        date: '2026-05-30',
        slot: 'lunch',
        dishId: 'd2',
        completed: false,
        calories: 1000,
        protein: 25,
        fats: 30,
        carbs: 100,
      },
    ]);
    expect(await deriveNutritionOk('2026-05-30')).toBe(false);
  });
});
