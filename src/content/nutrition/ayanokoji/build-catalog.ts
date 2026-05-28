import type { Dish, DishIngredient, MealSlot } from '@/core/domain/nutrition-types';
import { assignDishTags } from '@/core/nutrition/import/tag-dish';
import { SLOT_DISH_RANGES } from './slot-targets';
import { AYANOKOJI_INGREDIENTS, getAyanokojiIngredient } from './ingredients';
import { BREAKFAST_PATTERNS } from './dishes/breakfast';
import { LUNCH_PATTERNS } from './dishes/lunch';
import { DINNER_PATTERNS } from './dishes/dinner';
import { SNACK_PATTERNS } from './dishes/snack';
import { expandPattern, type DishPattern, type DishSeed } from './dishes/dish-seed';

function calcMacros(ingredients: DishIngredient[], servings: number) {
  let cal = 0;
  let p = 0;
  let f = 0;
  let c = 0;
  for (const di of ingredients) {
    if (di.optional || di.amount == null) continue;
    const ing = getAyanokojiIngredient(di.ingredientId);
    if (!ing) continue;
    const grams = di.unit === 'pcs' ? 50 * di.amount : di.amount;
    const ratio = grams / 100;
    cal += (ing.caloriesPer100g ?? 0) * ratio;
    p += (ing.proteinPer100g ?? 0) * ratio;
    f += (ing.fatsPer100g ?? 0) * ratio;
    c += (ing.carbsPer100g ?? 0) * ratio;
  }
  return {
    totalCalories: Math.round(cal / servings),
    totalProtein: Math.round(p / servings),
    totalFats: Math.round(f / servings),
    totalCarbs: Math.round(c / servings),
  };
}

function seedsFromPatterns(patterns: DishPattern[]): DishSeed[] {
  const seeds: DishSeed[] = [];
  for (const pattern of patterns) {
    for (let v = 0; v < 5; v++) {
      seeds.push(expandPattern(pattern, v));
    }
  }
  return seeds;
}

function seedToDish(seed: DishSeed): Dish {
  const macros = calcMacros(seed.ingredients, 1);
  const ingMap = new Map(AYANOKOJI_INGREDIENTS.map((i) => [i.id, i]));
  let dish: Dish = {
    id: seed.id,
    name: seed.name,
    ingredients: seed.ingredients,
    servings: 1,
    ...macros,
    tags: seed.tags,
    primaryTags: seed.tags.slice(0, 3),
    source: 'curated',
    cookTimeMin: seed.cookTimeMin,
    region: 'ru',
    mealSlots: [seed.slot],
  };
  dish = assignDishTags(dish, ingMap);
  if (!dish.tags.includes(seed.slot as (typeof dish.tags)[number])) {
    dish.tags = [...dish.tags, seed.slot as (typeof dish.tags)[number]];
  }
  return dish;
}

function validateDish(dish: Dish, slot: MealSlot): boolean {
  const range = SLOT_DISH_RANGES[slot];
  const p = dish.totalProtein ?? 0;
  const cal = dish.totalCalories ?? 0;
  return p >= range.proteinMin && p <= range.proteinMax && cal >= range.calMin && cal <= range.calMax;
}

export function buildAyanokojiDishes(): Dish[] {
  const allSeeds = [
    ...seedsFromPatterns(BREAKFAST_PATTERNS),
    ...seedsFromPatterns(LUNCH_PATTERNS),
    ...seedsFromPatterns(DINNER_PATTERNS),
    ...seedsFromPatterns(SNACK_PATTERNS),
  ];
  const ids = new Set<string>();
  for (const s of allSeeds) {
    if (ids.has(s.id)) throw new Error(`Duplicate dish id: ${s.id}`);
    ids.add(s.id);
  }
  const dishes = allSeeds.map(seedToDish);
  const bySlot: Record<MealSlot, Dish[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const d of dishes) {
    const slot = d.mealSlots?.[0];
    if (slot) bySlot[slot].push(d);
  }
  for (const slot of Object.keys(bySlot) as MealSlot[]) {
    if (bySlot[slot].length !== 50) {
      throw new Error(`Expected 50 ${slot} dishes, got ${bySlot[slot].length}`);
    }
    const invalid = bySlot[slot].filter((d) => !validateDish(d, slot));
    if (invalid.length > 0) {
      console.warn(
        `Slot ${slot}: ${invalid.length} dishes outside macro range:`,
        invalid.slice(0, 3).map((d) => d.id)
      );
    }
  }
  return dishes;
}

export const CURATED_INGREDIENTS = AYANOKOJI_INGREDIENTS;
export const CURATED_DISHES = buildAyanokojiDishes();
