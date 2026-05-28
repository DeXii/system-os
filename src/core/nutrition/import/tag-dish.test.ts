import { describe, expect, it } from 'vitest';
import type { Dish, Ingredient } from '@/core/domain/nutrition-types';
import { assignDishTags } from './tag-dish';

describe('tag-dish', () => {
  it('assigns high_protein when protein per serving >= 25', () => {
    const dish: Dish = {
      id: 't',
      name: 'Творог',
      ingredients: [],
      servings: 1,
      totalProtein: 30,
      tags: [],
      primaryTags: [],
      source: 'curated',
      region: 'ru',
    };
    const tagged = assignDishTags(dish, new Map<string, Ingredient>());
    expect(tagged.tags).toContain('high_protein');
  });

  it('always has at least one tag', () => {
    const dish: Dish = {
      id: 'x',
      name: 'X',
      ingredients: [],
      servings: 1,
      tags: [],
      primaryTags: [],
      source: 'curated',
      region: 'ru',
    };
    const tagged = assignDishTags(dish, new Map());
    expect(tagged.tags.length).toBeGreaterThanOrEqual(1);
  });
});
