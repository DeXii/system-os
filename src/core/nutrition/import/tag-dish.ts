import type { Dish, DishTag, Ingredient } from '@/core/domain/nutrition-types';
import { CHEAP_COST_RUB, HIGH_PROTEIN_PER_SERVING } from './dish-tag-rules';

const SPORTS_KEYWORDS = [
  'протеин',
  'творог',
  'коктейль',
  'шейк',
  'овсян',
  'банан',
  'яичниц',
  'греч',
  'куриц',
];

const RU_BASIC_KEYWORDS = [
  'греч',
  'каш',
  'суп',
  'борщ',
  'котлет',
  'плов',
  'гречк',
  'овсян',
  'яичниц',
  'омлет',
  'творог',
  'курин',
  'рис',
  'макарон',
];

export function assignDishTags(dish: Dish, ingredients: Map<string, Ingredient>): Dish {
  const tags = new Set<DishTag>(dish.tags ?? []);
  const protein = dish.totalProtein ?? 0;
  const servings = dish.servings || 1;
  const proteinPerServing = protein / servings;
  const cost = dish.estimatedCostRub ?? estimateCost(dish, ingredients);

  if (proteinPerServing >= HIGH_PROTEIN_PER_SERVING) tags.add('high_protein');
  if (cost <= CHEAP_COST_RUB) tags.add('cheap');
  if ((dish.cookTimeMin ?? 99) <= 20) tags.add('quick');
  if ((dish.cookTimeMin ?? 0) <= 10) tags.add('minimal_cook');

  const nameLower = dish.name.toLowerCase();
  if (RU_BASIC_KEYWORDS.some((k) => nameLower.includes(k))) tags.add('ru_basic');
  if (SPORTS_KEYWORDS.some((k) => nameLower.includes(k))) tags.add('sports_food');
  if (nameLower.includes('домаш') || nameLower.includes('бабуш')) tags.add('ru_home');

  const tagList = [...tags];
  if (tagList.length === 0) tagList.push('ru_basic');

  const primaryTags = pickPrimaryTags(tagList);

  return { ...dish, tags: tagList, primaryTags, estimatedCostRub: cost };
}

function estimateCost(dish: Dish, ingredients: Map<string, Ingredient>): number {
  let total = 0;
  for (const di of dish.ingredients) {
    const ing = ingredients.get(di.ingredientId);
    if (!ing || di.optional || di.amount == null) continue;
    const amt = di.amount;
    const factor = di.unit === 'kg' ? 1000 : di.unit === 'pcs' ? 1 : 1;
    const grams = di.unit === 'pcs' ? 50 : amt / (factor > 1 ? factor : 1);
    const pricePerKg = ing.category === 'meat' ? 450 : ing.category === 'dairy' ? 200 : 80;
    total += (grams / 1000) * pricePerKg;
  }
  return Math.round(total) || 120;
}

function pickPrimaryTags(tags: DishTag[]): DishTag[] {
  const priority: DishTag[] = [
    'high_protein',
    'sports_food',
    'cheap',
    'ru_basic',
    'quick',
    'bulk',
    'cut',
  ];
  const picked: DishTag[] = [];
  for (const p of priority) {
    if (tags.includes(p) && picked.length < 3) picked.push(p);
  }
  if (picked.length === 0) picked.push(tags[0]);
  return picked;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
