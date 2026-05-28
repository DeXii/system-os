import type { Ingredient, IngredientCategory } from '@/core/domain/nutrition-types';

type IngSeed = {
  id: string;
  name: string;
  category: IngredientCategory;
  cal: number;
  p: number;
  f: number;
  c: number;
  unit?: 'g' | 'ml' | 'pcs';
};

function ing(s: IngSeed): Ingredient {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    defaultUnit: s.unit ?? 'g',
    caloriesPer100g: s.cal,
    proteinPer100g: s.p,
    fatsPer100g: s.f,
    carbsPer100g: s.c,
    source: 'curated',
    searchKeywords: [s.name.toLowerCase(), s.id],
    qualityScore: 90,
  };
}

const RAW: IngSeed[] = [
  { id: 'chicken_breast', name: 'Куриная грудка', category: 'meat', cal: 165, p: 31, f: 3.6, c: 0 },
  { id: 'chicken_thigh', name: 'Куриное бедро', category: 'meat', cal: 185, p: 24, f: 9, c: 0 },
  { id: 'turkey', name: 'Индейка', category: 'meat', cal: 135, p: 30, f: 1, c: 0 },
  { id: 'beef_lean', name: 'Говядина постная', category: 'meat', cal: 187, p: 26, f: 9, c: 0 },
  { id: 'pork_lean', name: 'Свинина постная', category: 'meat', cal: 196, p: 27, f: 9, c: 0 },
  { id: 'tuna_canned', name: 'Тунец консервированный', category: 'meat', cal: 116, p: 26, f: 1, c: 0 },
  { id: 'cod_fillet', name: 'Треска', category: 'meat', cal: 82, p: 18, f: 0.7, c: 0 },
  { id: 'eggs', name: 'Яйца', category: 'dairy', cal: 155, p: 13, f: 11, c: 1.1, unit: 'pcs' },
  { id: 'cottage_5', name: 'Творог 5%', category: 'dairy', cal: 121, p: 17, f: 5, c: 1.8 },
  { id: 'cottage_0', name: 'Творог 0%', category: 'dairy', cal: 71, p: 16, f: 0.5, c: 3.3 },
  { id: 'milk_25', name: 'Молоко 2.5%', category: 'dairy', cal: 52, p: 2.8, f: 2.5, c: 4.7, unit: 'ml' },
  { id: 'kefir', name: 'Кефир 1%', category: 'dairy', cal: 40, p: 3, f: 1, c: 4, unit: 'ml' },
  { id: 'yogurt_greek', name: 'Греческий йогурт', category: 'dairy', cal: 59, p: 10, f: 0.4, c: 3.6 },
  { id: 'yogurt_natural', name: 'Йогурт натуральный', category: 'dairy', cal: 60, p: 4, f: 3, c: 4.5 },
  { id: 'cheese_hard', name: 'Сыр твёрдый', category: 'dairy', cal: 350, p: 25, f: 27, c: 2 },
  { id: 'rice_white', name: 'Рис белый', category: 'grains', cal: 130, p: 2.7, f: 0.3, c: 28 },
  { id: 'rice_brown', name: 'Рис бурый', category: 'grains', cal: 111, p: 2.6, f: 0.9, c: 23 },
  { id: 'buckwheat', name: 'Гречка', category: 'grains', cal: 132, p: 4.5, f: 1.6, c: 25 },
  { id: 'oatmeal', name: 'Овсянка', category: 'grains', cal: 68, p: 2.4, f: 1.4, c: 12 },
  { id: 'pasta', name: 'Макароны', category: 'grains', cal: 131, p: 5, f: 1.1, c: 25 },
  { id: 'bread_rye', name: 'Хлеб ржаной', category: 'grains', cal: 259, p: 8.5, f: 3.3, c: 48 },
  { id: 'bread_whole', name: 'Хлеб цельнозерновой', category: 'grains', cal: 247, p: 13, f: 4.2, c: 41 },
  { id: 'potato', name: 'Картофель', category: 'vegetables', cal: 77, p: 2, f: 0.1, c: 17 },
  { id: 'sweet_potato', name: 'Батат', category: 'vegetables', cal: 86, p: 1.6, f: 0.1, c: 20 },
  { id: 'broccoli', name: 'Брокколи', category: 'vegetables', cal: 34, p: 2.8, f: 0.4, c: 7 },
  { id: 'cabbage', name: 'Капуста', category: 'vegetables', cal: 25, p: 1.3, f: 0.1, c: 6 },
  { id: 'carrot', name: 'Морковь', category: 'vegetables', cal: 41, p: 0.9, f: 0.2, c: 10 },
  { id: 'cucumber', name: 'Огурец', category: 'vegetables', cal: 15, p: 0.7, f: 0.1, c: 3.6 },
  { id: 'tomato', name: 'Помидор', category: 'vegetables', cal: 18, p: 0.9, f: 0.2, c: 3.9 },
  { id: 'pepper', name: 'Перец болгарский', category: 'vegetables', cal: 31, p: 1, f: 0.3, c: 6 },
  { id: 'zucchini', name: 'Кабачок', category: 'vegetables', cal: 17, p: 1.2, f: 0.3, c: 3.1 },
  { id: 'spinach', name: 'Шпинат', category: 'vegetables', cal: 23, p: 2.9, f: 0.4, c: 3.6 },
  { id: 'green_beans', name: 'Стручковая фасоль', category: 'vegetables', cal: 31, p: 1.8, f: 0.1, c: 7 },
  { id: 'lentils', name: 'Чечевица', category: 'pantry', cal: 116, p: 9, f: 0.4, c: 20 },
  { id: 'chickpeas', name: 'Нут', category: 'pantry', cal: 164, p: 8.9, f: 2.6, c: 27 },
  { id: 'beans_white', name: 'Фасоль белая', category: 'pantry', cal: 127, p: 8.7, f: 0.5, c: 23 },
  { id: 'banana', name: 'Банан', category: 'fruits', cal: 89, p: 1.1, f: 0.3, c: 23, unit: 'pcs' },
  { id: 'apple', name: 'Яблоко', category: 'fruits', cal: 52, p: 0.3, f: 0.2, c: 14, unit: 'pcs' },
  { id: 'orange', name: 'Апельсин', category: 'fruits', cal: 47, p: 0.9, f: 0.1, c: 12, unit: 'pcs' },
  { id: 'berries_frozen', name: 'Ягоды замороженные', category: 'fruits', cal: 57, p: 0.7, f: 0.3, c: 14 },
  { id: 'olive_oil', name: 'Оливковое масло', category: 'fats', cal: 884, p: 0, f: 100, c: 0, unit: 'ml' },
  { id: 'butter', name: 'Сливочное масло', category: 'fats', cal: 717, p: 0.9, f: 81, c: 0.1 },
  { id: 'sunflower_oil', name: 'Подсолнечное масло', category: 'fats', cal: 884, p: 0, f: 100, c: 0, unit: 'ml' },
  { id: 'walnuts', name: 'Грецкий орех', category: 'fats', cal: 654, p: 15, f: 65, c: 14 },
  { id: 'peanuts', name: 'Арахис', category: 'fats', cal: 567, p: 26, f: 49, c: 16 },
  { id: 'honey', name: 'Мёд', category: 'pantry', cal: 304, p: 0.3, f: 0, c: 82 },
  { id: 'tomato_paste', name: 'Томатная паста', category: 'pantry', cal: 82, p: 4.3, f: 0.5, c: 19 },
  { id: 'onion', name: 'Лук репчатый', category: 'vegetables', cal: 40, p: 1.1, f: 0.1, c: 9 },
  { id: 'garlic', name: 'Чеснок', category: 'spices', cal: 149, p: 6.4, f: 0.5, c: 33 },
  { id: 'salt', name: 'Соль', category: 'spices', cal: 0, p: 0, f: 0, c: 0 },
  { id: 'pepper_black', name: 'Перец чёрный', category: 'spices', cal: 251, p: 10, f: 3.3, c: 64 },
  { id: 'soy_sauce', name: 'Соевый соус', category: 'pantry', cal: 53, p: 8, f: 0.1, c: 5, unit: 'ml' },
  { id: 'mustard', name: 'Горчица', category: 'pantry', cal: 66, p: 4, f: 4, c: 5 },
  { id: 'lemon', name: 'Лимон', category: 'fruits', cal: 29, p: 1.1, f: 0.3, c: 9, unit: 'pcs' },
  { id: 'cottage_9', name: 'Творог 9%', category: 'dairy', cal: 159, p: 16, f: 9, c: 2 },
  { id: 'minced_chicken', name: 'Фарш куриный', category: 'meat', cal: 143, p: 23, f: 5, c: 0 },
  { id: 'herring', name: 'Сельдь', category: 'meat', cal: 158, p: 18, f: 9, c: 0 },
  { id: 'mackerel', name: 'Скумбрия', category: 'meat', cal: 205, p: 19, f: 14, c: 0 },
  { id: 'squid', name: 'Кальмар', category: 'meat', cal: 92, p: 18, f: 1.4, c: 3 },
  { id: 'mushrooms', name: 'Шампиньоны', category: 'vegetables', cal: 22, p: 3.1, f: 0.3, c: 3.3 },
  { id: 'beet', name: 'Свёкла', category: 'vegetables', cal: 43, p: 1.6, f: 0.2, c: 10 },
  { id: 'pumpkin', name: 'Тыква', category: 'vegetables', cal: 26, p: 1, f: 0.1, c: 7 },
  { id: 'corn', name: 'Кукуруза консервированная', category: 'vegetables', cal: 86, p: 3.2, f: 1.2, c: 19 },
  { id: 'peas_frozen', name: 'Горошек зелёный', category: 'vegetables', cal: 81, p: 5.4, f: 0.4, c: 14 },
  { id: 'flour', name: 'Мука', category: 'pantry', cal: 364, p: 10, f: 1, c: 76 },
  { id: 'oat_flakes', name: 'Хлопья овсяные', category: 'grains', cal: 366, p: 12, f: 6, c: 62 },
  { id: 'cocoa', name: 'Какао', category: 'pantry', cal: 228, p: 20, f: 14, c: 58 },
  { id: 'protein_powder', name: 'Протеин (порошок)', category: 'pantry', cal: 370, p: 75, f: 3, c: 8 },
  { id: 'cottage_cheese_snack', name: 'Сырки глазированные', category: 'dairy', cal: 340, p: 8, f: 20, c: 32, unit: 'pcs' },
  { id: 'sausage_diet', name: 'Колбаса диетическая', category: 'meat', cal: 120, p: 12, f: 8, c: 2 },
  { id: 'seaweed', name: 'Водоросли нори', category: 'other', cal: 35, p: 6, f: 0.5, c: 5 },
];

export const AYANOKOJI_INGREDIENTS: Ingredient[] = RAW.map(ing);

const byId = new Map(AYANOKOJI_INGREDIENTS.map((i) => [i.id, i]));

export function getAyanokojiIngredient(id: string): Ingredient | undefined {
  return byId.get(id);
}
