import type { Dish, DishTag, Ingredient, IngredientCategory } from '@/core/domain/nutrition-types';

export function searchIngredients(
  items: Ingredient[],
  query: string,
  category?: IngredientCategory
): Ingredient[] {
  const q = query.trim().toLowerCase();
  let list = items.filter((i) => !i.archived);
  if (category) list = list.filter((i) => i.category === category);
  if (!q) return list.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  return list
    .filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.searchKeywords?.some((k) => k.includes(q)) ||
        i.id.includes(q)
    )
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

export function searchDishes(
  items: Dish[],
  query: string,
  tags?: DishTag[],
  matchAll = false
): Dish[] {
  const q = query.trim().toLowerCase();
  let list = [...items];
  if (tags?.length) {
    list = list.filter((d) => {
      const has = (t: DishTag) => d.tags.includes(t);
      return matchAll ? tags.every(has) : tags.some(has);
    });
  }
  if (!q) return list;
  return list.filter(
    (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
  );
}

export function getDishesByTags(items: Dish[], requiredTags: DishTag[]): Dish[] {
  return items.filter((d) => requiredTags.every((t) => d.tags.includes(t)));
}
