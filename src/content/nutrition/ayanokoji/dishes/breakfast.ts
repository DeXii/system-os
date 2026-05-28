import type { DishPattern } from './dish-seed';

export const BREAKFAST_PATTERNS: DishPattern[] = [
  {
    baseId: 'bf_oat_eggs',
    name: 'Овсянка с яйцами',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'oatmeal', amount: 60, unit: 'g' },
      { ingredientId: 'milk_25', amount: 150, unit: 'ml' },
      { ingredientId: 'eggs', amount: 2, unit: 'pcs' },
    ],
    tags: ['ru_basic', 'stable_energy', 'high_protein', 'cheap'],
    cookTimeMin: 12,
  },
  {
    baseId: 'bf_cottage_berry',
    name: 'Творог с ягодами',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'cottage_5', amount: 200, unit: 'g' },
      { ingredientId: 'berries_frozen', amount: 80, unit: 'g' },
    ],
    tags: ['ru_basic', 'high_protein', 'stable_energy', 'quick'],
    cookTimeMin: 3,
  },
  {
    baseId: 'bf_buckwheat_omelet',
    name: 'Гречка с омлетом',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'buckwheat', amount: 70, unit: 'g' },
      { ingredientId: 'eggs', amount: 3, unit: 'pcs' },
      { ingredientId: 'spinach', amount: 50, unit: 'g' },
    ],
    tags: ['ru_basic', 'stable_energy', 'high_fiber', 'cheap'],
    cookTimeMin: 18,
  },
  {
    baseId: 'bf_yogurt_nuts',
    name: 'Йогурт с орехами',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'yogurt_greek', amount: 200, unit: 'g' },
      { ingredientId: 'walnuts', amount: 20, unit: 'g' },
      { ingredientId: 'apple', amount: 1, unit: 'pcs' },
    ],
    tags: ['stable_energy', 'high_fiber', 'quick'],
    cookTimeMin: 5,
  },
  {
    baseId: 'bf_rye_turkey',
    name: 'Ржаной тост с индейкой',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'bread_rye', amount: 80, unit: 'g' },
      { ingredientId: 'turkey', amount: 100, unit: 'g' },
      { ingredientId: 'cucumber', amount: 60, unit: 'g' },
    ],
    tags: ['ru_basic', 'high_protein', 'quick', 'cheap'],
    cookTimeMin: 10,
  },
  {
    baseId: 'bf_oat_banana',
    name: 'Овсянка с бананом',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'oatmeal', amount: 70, unit: 'g' },
      { ingredientId: 'milk_25', amount: 180, unit: 'ml' },
      { ingredientId: 'banana', amount: 1, unit: 'pcs' },
    ],
    tags: ['stable_energy', 'sports_food', 'cheap'],
    cookTimeMin: 10,
  },
  {
    baseId: 'bf_eggs_veg',
    name: 'Яичница с овощами',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'eggs', amount: 3, unit: 'pcs' },
      { ingredientId: 'tomato', amount: 100, unit: 'g' },
      { ingredientId: 'pepper', amount: 80, unit: 'g' },
      { ingredientId: 'olive_oil', amount: 5, unit: 'ml' },
    ],
    tags: ['high_protein', 'high_fiber', 'quick'],
    cookTimeMin: 10,
  },
  {
    baseId: 'bf_kefir_cottage',
    name: 'Кефир с творогом',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'kefir', amount: 250, unit: 'ml' },
      { ingredientId: 'cottage_0', amount: 150, unit: 'g' },
    ],
    tags: ['high_protein', 'quick', 'light_meal', 'cheap'],
    cookTimeMin: 2,
  },
  {
    baseId: 'bf_rice_chicken',
    name: 'Рис с курицей (утро)',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'rice_white', amount: 60, unit: 'g' },
      { ingredientId: 'chicken_breast', amount: 120, unit: 'g' },
    ],
    tags: ['high_protein', 'stable_energy', 'meal_prep'],
    cookTimeMin: 25,
  },
  {
    baseId: 'bf_pancake_cottage',
    name: 'Творожные сырники',
    slot: 'breakfast',
    ingredients: [
      { ingredientId: 'cottage_5', amount: 180, unit: 'g' },
      { ingredientId: 'eggs', amount: 1, unit: 'pcs' },
      { ingredientId: 'flour', amount: 30, unit: 'g' },
      { ingredientId: 'honey', amount: 10, unit: 'g' },
    ],
    tags: ['ru_home', 'high_protein', 'cheap'],
    cookTimeMin: 15,
  },
];
