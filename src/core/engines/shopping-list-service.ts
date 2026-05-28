import { db, uid } from '@/core/db';
import type { Dish, Ingredient, ShoppingList } from '@/core/domain/nutrition-types';
import {
  buildShoppingList,
  mergeUserFlags,
} from './shopping-list-engine';

async function loadCatalogMaps(): Promise<{
  dishes: Map<string, Dish>;
  ingredients: Map<string, Ingredient>;
}> {
  const [dishRows, ingRows, customD, customI] = await Promise.all([
    db.dishes.toArray(),
    db.ingredients.toArray(),
    db.customDishes.toArray(),
    db.customIngredients.toArray(),
  ]);
  const dishes = new Map<string, Dish>();
  const ingredients = new Map<string, Ingredient>();
  for (const d of [...dishRows, ...customD]) dishes.set(d.id, d);
  for (const i of [...ingRows, ...customI]) ingredients.set(i.id, i);
  return { dishes, ingredients };
}

export async function getActiveShoppingList(planId: string): Promise<ShoppingList | undefined> {
  const lists = await db.shoppingLists.where('planId').equals(planId).toArray();
  if (!lists.length) return undefined;
  return lists.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function generateShoppingList(
  planStateId: string,
  opts?: { title?: string }
): Promise<ShoppingList> {
  const plan = await db.nutritionPlanState.get(planStateId);
  if (!plan) throw new Error('План не найден');

  const { dishes, ingredients } = await loadCatalogMaps();
  const built = buildShoppingList(plan, dishes, ingredients, { title: opts?.title });
  const now = new Date().toISOString();
  const existing = await getActiveShoppingList(plan.id);

  const list: ShoppingList = {
    id: existing?.id ?? uid(),
    ...built,
    items: existing ? mergeUserFlags(built.items, existing.items) : built.items,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.shoppingLists.put(list);
  return list;
}

export async function recalculateShoppingList(listId: string): Promise<ShoppingList> {
  const list = await db.shoppingLists.get(listId);
  if (!list) throw new Error('Список не найден');
  const plan = await db.nutritionPlanState.get(list.planId);
  if (!plan) throw new Error('План не найден');

  const { dishes, ingredients } = await loadCatalogMaps();
  const built = buildShoppingList(plan, dishes, ingredients, { title: list.title });
  const updated: ShoppingList = {
    ...list,
    items: mergeUserFlags(built.items, list.items),
    daysCount: built.daysCount,
    updatedAt: new Date().toISOString(),
  };
  await db.shoppingLists.put(updated);
  return updated;
}

export async function toggleShoppingListItem(
  listId: string,
  ingredientId: string,
  field: 'checked' | 'alreadyHave'
): Promise<ShoppingList> {
  const list = await db.shoppingLists.get(listId);
  if (!list) throw new Error('Список не найден');
  const items = list.items.map((i) =>
    i.ingredientId === ingredientId ? { ...i, [field]: !i[field] } : i
  );
  const updated = { ...list, items, updatedAt: new Date().toISOString() };
  await db.shoppingLists.put(updated);
  return updated;
}

export async function clearPurchasedItems(listId: string): Promise<ShoppingList> {
  const list = await db.shoppingLists.get(listId);
  if (!list) throw new Error('Список не найден');
  const items = list.items.map((i) => (i.checked ? { ...i, checked: false } : i));
  const updated = { ...list, items, updatedAt: new Date().toISOString() };
  await db.shoppingLists.put(updated);
  return updated;
}
