import type {
  Dish,
  Ingredient,
  IngredientCategory,
  IngredientUnit,
  NutritionPlanState,
  ShoppingList,
  ShoppingListItem,
} from '@/core/domain/nutrition-types';
import { getPlannedMealDishIds } from '@/core/nutrition/meal-ids';
import { canMergeUnits, normalizeAmount } from './nutrition-unit-normalize';

export interface IngredientEntry {
  ingredientId: string;
  name: string;
  amount: number;
  unit: IngredientUnit;
  dishId: string;
  optional?: boolean;
}

export interface ShoppingListSummary {
  totalItems: number;
  ingredientCount: number;
  alreadyHaveCount: number;
  needToBuyCount: number;
}

export function collectIngredientEntries(
  plan: NutritionPlanState,
  dishes: Map<string, Dish>,
  ingredients: Map<string, Ingredient>
): IngredientEntry[] {
  const entries: IngredientEntry[] = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const dishIds = getPlannedMealDishIds(meal, plan, day.dayIndex);
      for (const dishId of dishIds) {
        const dish = dishes.get(dishId);
        if (!dish?.ingredients?.length) continue;
        for (const di of dish.ingredients) {
          if (di.optional || di.amount == null) continue;
          const ing = ingredients.get(di.ingredientId);
          entries.push({
            ingredientId: di.ingredientId,
            name: ing?.name ?? di.ingredientId,
            amount: di.amount,
            unit: di.unit,
            dishId: dish.id,
            optional: di.optional,
          });
        }
      }
    }
  }
  return entries;
}

export function aggregateShoppingItems(
  entries: IngredientEntry[],
  ingredients: Map<string, Ingredient>
): ShoppingListItem[] {
  const groups = new Map<string, ShoppingListItem & { _units: Set<string> }>();

  for (const e of entries) {
    const key = e.ingredientId || e.name;
    const ing = ingredients.get(e.ingredientId);
    const norm = normalizeAmount(e.amount, e.unit);
    if (!norm) continue;

    let item = groups.get(key);
    if (!item) {
      item = {
        ingredientId: e.ingredientId,
        name: ing?.name ?? e.name,
        totalAmount: 0,
        unit: norm.unit,
        category: ing?.category ?? 'other',
        checked: false,
        alreadyHave: false,
        sourceDishIds: [],
        _units: new Set(),
      };
      groups.set(key, item);
    }

    if (canMergeUnits(item.unit, norm.unit)) {
      const existing = normalizeAmount(item.totalAmount, item.unit);
      const incoming = norm;
      if (existing && existing.unit === incoming.unit) {
        item.totalAmount = existing.amount + incoming.amount;
      } else {
        item.unnormalizedUnits = [...(item.unnormalizedUnits ?? []), e.unit];
      }
    } else {
      item.unnormalizedUnits = [...(item.unnormalizedUnits ?? []), e.unit];
    }

    if (!item.sourceDishIds?.includes(e.dishId)) {
      item.sourceDishIds = [...(item.sourceDishIds ?? []), e.dishId];
    }
  }

  return [...groups.values()].map(({ _units, ...item }) => item);
}

export function applyAlreadyHave(
  items: ShoppingListItem[],
  pantryIds: Set<string>
): ShoppingListItem[] {
  return items.map((i) => ({
    ...i,
    alreadyHave: pantryIds.has(i.ingredientId) || i.alreadyHave,
  }));
}

export function getShoppingListSummary(items: ShoppingListItem[]): ShoppingListSummary {
  const alreadyHaveCount = items.filter((i) => i.alreadyHave).length;
  const needToBuyCount = items.filter((i) => !i.alreadyHave && !i.checked).length;
  return {
    totalItems: items.length,
    ingredientCount: new Set(items.map((i) => i.ingredientId)).size,
    alreadyHaveCount,
    needToBuyCount,
  };
}

export function buildShoppingList(
  plan: NutritionPlanState,
  dishes: Map<string, Dish>,
  ingredients: Map<string, Ingredient>,
  opts?: { title?: string; pantryIds?: Set<string> }
): Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'> {
  const entries = collectIngredientEntries(plan, dishes, ingredients);
  let items = aggregateShoppingItems(entries, ingredients);
  if (opts?.pantryIds) {
    items = applyAlreadyHave(items, opts.pantryIds);
  }
  return {
    planId: plan.id,
    title: opts?.title ?? plan.title,
    daysCount: plan.days.length,
    items,
  };
}

export function groupItemsByCategory(
  items: ShoppingListItem[]
): Record<IngredientCategory, ShoppingListItem[]> {
  const order: IngredientCategory[] = [
    'meat',
    'dairy',
    'grains',
    'vegetables',
    'fruits',
    'fats',
    'pantry',
    'spices',
    'other',
  ];
  const map = Object.fromEntries(order.map((c) => [c, [] as ShoppingListItem[]])) as Record<
    IngredientCategory,
    ShoppingListItem[]
  >;
  for (const item of items) {
    (map[item.category] ?? map.other).push(item);
  }
  return map;
}

export function mergeUserFlags(
  newItems: ShoppingListItem[],
  oldItems: ShoppingListItem[]
): ShoppingListItem[] {
  const oldMap = new Map(oldItems.map((i) => [i.ingredientId, i]));
  return newItems.map((i) => {
    const prev = oldMap.get(i.ingredientId);
    if (!prev) return i;
    return {
      ...i,
      checked: prev.checked,
      alreadyHave: prev.alreadyHave,
      notes: prev.notes,
    };
  });
}
