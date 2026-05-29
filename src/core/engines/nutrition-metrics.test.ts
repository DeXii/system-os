import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { aggregateDay } from './nutrition-metrics';

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
