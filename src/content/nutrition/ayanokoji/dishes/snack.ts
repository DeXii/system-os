import type { DishPattern } from './dish-seed';

export const SNACK_PATTERNS: DishPattern[] = [
  {
    baseId: 'sn_cottage',
    name: 'Творог',
    slot: 'snack',
    ingredients: [{ ingredientId: 'cottage_5', amount: 150, unit: 'g' }],
    tags: ['high_protein', 'quick', 'cheap'],
    cookTimeMin: 1,
  },
  {
    baseId: 'sn_eggs_boiled',
    name: 'Яйца вкрутую',
    slot: 'snack',
    ingredients: [{ ingredientId: 'eggs', amount: 2, unit: 'pcs' }],
    tags: ['high_protein', 'quick', 'cheap'],
    cookTimeMin: 10,
  },
  {
    baseId: 'sn_kefir_nuts',
    name: 'Кефир с орехами',
    slot: 'snack',
    ingredients: [
      { ingredientId: 'kefir', amount: 250, unit: 'ml' },
      { ingredientId: 'walnuts', amount: 15, unit: 'g' },
    ],
    tags: ['stable_energy', 'quick'],
    cookTimeMin: 2,
  },
  {
    baseId: 'sn_yogurt',
    name: 'Греческий йогурт',
    slot: 'snack',
    ingredients: [{ ingredientId: 'yogurt_greek', amount: 180, unit: 'g' }],
    tags: ['high_protein', 'quick', 'light_meal'],
    cookTimeMin: 1,
  },
  {
    baseId: 'sn_veg_hummus',
    name: 'Овощи с нутом',
    slot: 'snack',
    ingredients: [
      { ingredientId: 'chickpeas', amount: 80, unit: 'g' },
      { ingredientId: 'cucumber', amount: 100, unit: 'g' },
      { ingredientId: 'carrot', amount: 80, unit: 'g' },
    ],
    tags: ['high_fiber', 'cheap', 'light_meal'],
    cookTimeMin: 5,
  },
  {
    baseId: 'sn_protein_shake',
    name: 'Протеиновый коктейль',
    slot: 'snack',
    ingredients: [
      { ingredientId: 'milk_25', amount: 250, unit: 'ml' },
      { ingredientId: 'protein_powder', amount: 30, unit: 'g' },
    ],
    tags: ['high_protein', 'sports_food', 'quick'],
    cookTimeMin: 2,
  },
  {
    baseId: 'sn_cheese_bread',
    name: 'Сыр с хлебом',
    slot: 'snack',
    ingredients: [
      { ingredientId: 'cheese_hard', amount: 40, unit: 'g' },
      { ingredientId: 'bread_whole', amount: 50, unit: 'g' },
    ],
    tags: ['ru_basic', 'quick', 'cheap'],
    cookTimeMin: 3,
  },
  {
    baseId: 'sn_tuna_crisp',
    name: 'Тунец с овощами',
    slot: 'snack',
    ingredients: [
      { ingredientId: 'tuna_canned', amount: 100, unit: 'g' },
      { ingredientId: 'cucumber', amount: 80, unit: 'g' },
    ],
    tags: ['high_protein', 'quick', 'light_meal'],
    cookTimeMin: 3,
  },
  {
    baseId: 'sn_apple_peanut',
    name: 'Яблоко с арахисом',
    slot: 'snack',
    ingredients: [
      { ingredientId: 'apple', amount: 1, unit: 'pcs' },
      { ingredientId: 'peanuts', amount: 20, unit: 'g' },
    ],
    tags: ['stable_energy', 'high_fiber', 'quick'],
    cookTimeMin: 2,
  },
  {
    baseId: 'sn_cottage_honey',
    name: 'Творог с мёдом',
    slot: 'snack',
    ingredients: [
      { ingredientId: 'cottage_0', amount: 160, unit: 'g' },
      { ingredientId: 'honey', amount: 10, unit: 'g' },
    ],
    tags: ['high_protein', 'quick', 'cheap'],
    cookTimeMin: 2,
  },
];
