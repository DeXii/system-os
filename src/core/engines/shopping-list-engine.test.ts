import { describe, expect, it } from 'vitest';
import type { Dish, Ingredient, NutritionPlanState } from '@/core/domain/nutrition-types';
import {
  aggregateShoppingItems,
  applyAlreadyHave,
  buildShoppingList,
  collectIngredientEntries,
  getShoppingListSummary,
} from './shopping-list-engine';

const rice: Ingredient = {
  id: 'rice',
  name: 'Рис',
  category: 'grains',
  defaultUnit: 'g',
  source: 'curated',
};

const chicken: Ingredient = {
  id: 'chicken',
  name: 'Курица',
  category: 'meat',
  defaultUnit: 'g',
  source: 'curated',
};

const dishA: Dish = {
  id: 'a',
  name: 'A',
  servings: 1,
  ingredients: [{ ingredientId: 'rice', amount: 200, unit: 'g' }],
  tags: ['ru_basic'],
  primaryTags: ['ru_basic'],
  source: 'curated',
  region: 'ru',
};

const dishB: Dish = {
  id: 'b',
  name: 'B',
  servings: 1,
  ingredients: [{ ingredientId: 'rice', amount: 150, unit: 'g' }],
  tags: ['ru_basic'],
  primaryTags: ['ru_basic'],
  source: 'curated',
  region: 'ru',
};

const plan: NutritionPlanState = {
  id: 'p1',
  planId: 'tpl',
  title: 'Test',
  days: [
    {
      dayIndex: 0,
      meals: [
        { slot: 'lunch', dishIds: ['a'] },
        { slot: 'dinner', dishIds: ['b'] },
      ],
    },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('shopping-list-engine', () => {
  it('aggregates same ingredient across dishes', () => {
    const entries = collectIngredientEntries(
      plan,
      new Map([
        ['a', dishA],
        ['b', dishB],
      ]),
      new Map([
        ['rice', rice],
        ['chicken', chicken],
      ])
    );
    const items = aggregateShoppingItems(entries, new Map([['rice', rice]]));
    const riceItem = items.find((i) => i.ingredientId === 'rice');
    expect(riceItem?.totalAmount).toBe(350);
  });

  it('applyAlreadyHave filters need to buy count', () => {
    const items = applyAlreadyHave(
      [
        {
          ingredientId: 'rice',
          name: 'Рис',
          totalAmount: 100,
          unit: 'g',
          category: 'grains',
          checked: false,
          alreadyHave: false,
        },
        {
          ingredientId: 'chicken',
          name: 'Курица',
          totalAmount: 100,
          unit: 'g',
          category: 'meat',
          checked: false,
          alreadyHave: false,
        },
      ],
      new Set(['rice'])
    );
    const summary = getShoppingListSummary(items);
    expect(summary.alreadyHaveCount).toBe(1);
    expect(summary.needToBuyCount).toBe(1);
  });

  it('aggregates multiple dishes in one meal', () => {
    const multi: NutritionPlanState = {
      ...plan,
      days: [
        {
          dayIndex: 0,
          meals: [{ slot: 'lunch', dishIds: ['a', 'b'] }],
        },
      ],
    };
    const entries = collectIngredientEntries(
      multi,
      new Map([
        ['a', dishA],
        ['b', dishB],
      ]),
      new Map([['rice', rice]])
    );
    expect(entries).toHaveLength(2);
    const items = aggregateShoppingItems(entries, new Map([['rice', rice]]));
    expect(items.find((i) => i.ingredientId === 'rice')?.totalAmount).toBe(350);
  });

  it('collects all ingredients from a composite dish in the plan', () => {
    const eggs: Ingredient = {
      id: 'eggs',
      name: 'Яйца',
      category: 'dairy',
      defaultUnit: 'pcs',
      source: 'curated',
    };
    const buckwheat: Ingredient = {
      id: 'buckwheat',
      name: 'Гречка',
      category: 'grains',
      defaultUnit: 'g',
      source: 'curated',
    };
    const spinach: Ingredient = {
      id: 'spinach',
      name: 'Шпинат',
      category: 'vegetables',
      defaultUnit: 'g',
      source: 'curated',
    };
    const composite: Dish = {
      id: 'bf_omelet',
      name: 'Гречка с омлетом',
      servings: 1,
      ingredients: [
        { ingredientId: 'buckwheat', amount: 80, unit: 'g' },
        { ingredientId: 'eggs', amount: 3, unit: 'pcs' },
        { ingredientId: 'spinach', amount: 50, unit: 'g' },
      ],
      tags: ['breakfast'],
      primaryTags: ['breakfast'],
      source: 'curated',
      region: 'ru',
    };
    const oneDay: NutritionPlanState = {
      ...plan,
      days: [
        {
          dayIndex: 0,
          meals: [{ slot: 'breakfast', dishIds: ['bf_omelet'] }],
        },
      ],
    };
    const entries = collectIngredientEntries(
      oneDay,
      new Map([['bf_omelet', composite]]),
      new Map([
        ['eggs', eggs],
        ['buckwheat', buckwheat],
        ['spinach', spinach],
      ])
    );
    expect(entries.map((e) => e.ingredientId).sort()).toEqual(['buckwheat', 'eggs', 'spinach']);
  });

  it('empty plan yields empty list', () => {
    const empty: NutritionPlanState = { ...plan, days: [] };
    const built = buildShoppingList(empty, new Map(), new Map());
    expect(built.items).toHaveLength(0);
  });
});
