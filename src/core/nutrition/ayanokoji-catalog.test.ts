import { describe, expect, it } from 'vitest';
import { CURATED_DISHES, CURATED_INGREDIENTS } from '@/content/nutrition/ayanokoji';
import type { MealSlot } from '@/core/domain/nutrition-types';

describe('ayanokoji catalog', () => {
  it('has ~70 ingredients and 200 dishes', () => {
    expect(CURATED_INGREDIENTS.length).toBeGreaterThanOrEqual(60);
    expect(CURATED_DISHES).toHaveLength(200);
  });

  it('has exactly 50 dishes per slot', () => {
    const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    for (const slot of slots) {
      const count = CURATED_DISHES.filter(
        (d) => d.mealSlots?.includes(slot) || d.tags.includes(slot)
      ).length;
      expect(count).toBe(50);
    }
  });

  it('all dish ingredient ids exist', () => {
    const ids = new Set(CURATED_INGREDIENTS.map((i) => i.id));
    for (const dish of CURATED_DISHES) {
      for (const di of dish.ingredients) {
        expect(ids.has(di.ingredientId), `${dish.id} missing ${di.ingredientId}`).toBe(true);
      }
    }
  });
});
