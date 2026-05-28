/** Nutrition module domain types */

export type NutritionGoalType =
  | 'bulk'
  | 'cut'
  | 'maintain'
  | 'performance'
  | 'recovery'
  | 'budget';

export type IngredientCategory =
  | 'meat'
  | 'dairy'
  | 'grains'
  | 'vegetables'
  | 'fruits'
  | 'fats'
  | 'pantry'
  | 'spices'
  | 'other';

export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'tbsp' | 'tsp';

export type DishTag =
  | 'ru_basic'
  | 'ru_home'
  | 'high_protein'
  | 'sports_food'
  | 'cheap'
  | 'bulk'
  | 'cut'
  | 'maintain'
  | 'quick'
  | 'meal_prep'
  | 'minimal_cook'
  | 'recovery'
  | 'performance'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'stable_energy'
  | 'light_meal'
  | 'high_fiber'
  | 'budget';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type IngredientSource = 'curated' | 'off' | 'spoonacular' | 'user';
export type DishSource = 'curated' | 'spoonacular' | 'ai' | 'user';

export interface Ingredient {
  id: string;
  name: string;
  nameEn?: string;
  category: IngredientCategory;
  defaultUnit: IngredientUnit;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  fatsPer100g?: number;
  carbsPer100g?: number;
  source: IngredientSource;
  externalId?: string;
  searchKeywords?: string[];
  qualityScore?: number;
  archived?: boolean;
}

export interface DishIngredient {
  ingredientId: string;
  amount?: number;
  unit: IngredientUnit;
  optional?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  ingredients: DishIngredient[];
  servings: number;
  totalCalories?: number;
  totalProtein?: number;
  totalFats?: number;
  totalCarbs?: number;
  tags: DishTag[];
  primaryTags: DishTag[];
  source: DishSource;
  externalId?: string;
  cookTimeMin?: number;
  estimatedCostRub?: number;
  region: 'ru';
  mealSlots?: MealSlot[];
}

export interface NutritionGoal {
  id: string;
  targetCalories: number;
  targetProtein: number;
  targetFats: number;
  targetCarbs: number;
  goalType: NutritionGoalType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorBodyMetrics {
  id: string;
  weight: number;
  height: number;
  age: number;
  sex?: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  trainingDaysPerWeek: number;
  updatedAt: string;
}

export interface PlannedMeal {
  slot: MealSlot;
  /** Preferred: one or more dishes per meal */
  dishIds?: string[];
  /** @deprecated legacy single-dish plans */
  dishId?: string;
}

export interface MealPlanDay {
  dayIndex: number;
  meals: PlannedMeal[];
}

export interface MealPlanTemplate {
  id: string;
  name: string;
  description: string;
  goalType: NutritionGoalType;
  daysCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  requiredTags: DishTag[];
  preferredTags?: DishTag[];
  days: MealPlanDay[];
}

export interface NutritionPlanState {
  id: string;
  planId: string;
  title: string;
  days: MealPlanDay[];
  /** key: `${dayIndex}-${slot}` → dish ids for that meal */
  mealSwaps?: Record<string, string[]>;
  /** @deprecated use mealSwaps */
  dishSwaps?: Record<string, string>;
  updatedAt: string;
  createdAt: string;
}

export interface MealEntry {
  id: string;
  date: string;
  slot: MealSlot;
  dishId?: string;
  completed: boolean;
  calories?: number;
  protein?: number;
  fats?: number;
  carbs?: number;
  notes?: string;
}

export interface NutritionDay {
  id: string;
  date: string;
  mealEntryIds: string[];
  completed: boolean;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  recoveryScore?: number;
  energyScore?: number;
}

export interface ShoppingListItem {
  ingredientId: string;
  name: string;
  totalAmount: number;
  unit: IngredientUnit;
  category: IngredientCategory;
  checked: boolean;
  alreadyHave: boolean;
  notes?: string;
  sourceDishIds?: string[];
  unnormalizedUnits?: string[];
}

export interface ShoppingList {
  id: string;
  planId: string;
  title: string;
  dateRange?: { from: string; to: string };
  daysCount: number;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
}

export const DISH_TAG_LABELS: Record<DishTag, string> = {
  ru_basic: 'RU базовые',
  ru_home: 'Домашняя',
  high_protein: 'High protein',
  sports_food: 'Спорт',
  cheap: 'Дёшево',
  bulk: 'Набор массы',
  cut: 'Сушка',
  maintain: 'Поддержание',
  quick: 'Быстро',
  meal_prep: 'Meal prep',
  minimal_cook: 'Мин. готовка',
  recovery: 'Восстановление',
  performance: 'Performance',
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
  stable_energy: 'Стабильная энергия',
  light_meal: 'Лёгкий приём',
  high_fiber: 'Клетчатка',
  budget: 'Бюджет',
};

export const INGREDIENT_CATEGORY_LABELS: Record<IngredientCategory, string> = {
  meat: 'Мясо',
  dairy: 'Молочное',
  grains: 'Крупы',
  vegetables: 'Овощи',
  fruits: 'Фрукты',
  fats: 'Жиры',
  pantry: 'Бакалея',
  spices: 'Специи',
  other: 'Прочее',
};
