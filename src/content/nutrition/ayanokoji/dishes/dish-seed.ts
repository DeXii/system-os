import type { DishIngredient, DishTag, MealSlot } from '@/core/domain/nutrition-types';

export type DishSeed = {
  id: string;
  name: string;
  slot: MealSlot;
  ingredients: DishIngredient[];
  tags: DishTag[];
  cookTimeMin: number;
};

export type DishPattern = {
  baseId: string;
  name: string;
  slot: MealSlot;
  ingredients: DishIngredient[];
  tags: DishTag[];
  cookTimeMin: number;
};

/** 5 portion scales for pattern variants */
export const VARIANT_SCALES = [0.85, 0.95, 1, 1.08, 1.15];

export function expandPattern(pattern: DishPattern, variantIndex: number): DishSeed {
  const scale = VARIANT_SCALES[variantIndex];
  const suffix = ['a', 'b', 'c', 'd', 'e'][variantIndex];
  const ingredients = pattern.ingredients.map((i) => ({
    ...i,
    amount:
      i.amount != null
        ? i.unit === 'pcs'
          ? Math.max(1, Math.round(i.amount * scale))
          : Math.round(i.amount * scale)
        : undefined,
  }));
  const slotTag = pattern.slot as DishTag;
  return {
    id: `${pattern.baseId}_${suffix}`,
    name:
      variantIndex === 2
        ? pattern.name
        : `${pattern.name} (${['S', 'M', '', 'L', 'XL'][variantIndex]})`,
    slot: pattern.slot,
    ingredients,
    tags: [...new Set([...pattern.tags, slotTag])],
    cookTimeMin: pattern.cookTimeMin,
  };
}
