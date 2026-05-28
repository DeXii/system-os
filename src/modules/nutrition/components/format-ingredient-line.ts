import type { DishIngredient, Ingredient } from '@/core/domain/nutrition-types';

export function formatIngredientLine(
  di: DishIngredient,
  ingredients: Map<string, Ingredient>
): string {
  const ing = ingredients.get(di.ingredientId);
  const name = ing?.name ?? di.ingredientId;
  if (di.amount == null) return name;
  return `${name} — ${Math.round(di.amount)}${di.unit}`;
}
