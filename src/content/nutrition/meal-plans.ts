import type { MealPlanTemplate } from '@/core/domain/nutrition-types';

export const MEAL_PLAN_TEMPLATES: MealPlanTemplate[] = [
  {
    id: 'operator_performance',
    name: 'Operator Performance',
    description: 'Стабильная энергия и когнитивная производительность',
    goalType: 'performance',
    daysCount: 7,
    difficulty: 'medium',
    requiredTags: ['ru_basic'],
    preferredTags: ['stable_energy', 'high_protein', 'performance'],
    days: [],
  },
  {
    id: 'operator_maintain',
    name: 'Operator Maintain',
    description: 'Поддержание формы без скачков сахара',
    goalType: 'maintain',
    daysCount: 7,
    difficulty: 'easy',
    requiredTags: ['ru_basic'],
    preferredTags: ['stable_energy', 'ru_basic'],
    days: [],
  },
  {
    id: 'operator_cut',
    name: 'Operator Cut',
    description: 'Дефицит с высоким белком без сонливости',
    goalType: 'cut',
    daysCount: 7,
    difficulty: 'medium',
    requiredTags: ['high_protein'],
    preferredTags: ['light_meal', 'high_protein', 'cut'],
    days: [],
  },
  {
    id: 'operator_bulk',
    name: 'Operator Bulk',
    description: 'Набор массы на бюджетных продуктах',
    goalType: 'bulk',
    daysCount: 7,
    difficulty: 'easy',
    requiredTags: ['cheap'],
    preferredTags: ['cheap', 'budget', 'bulk'],
    days: [],
  },
  {
    id: 'operator_recovery',
    name: 'Operator Recovery',
    description: 'Восстановление и лёгкие ужины',
    goalType: 'recovery',
    daysCount: 7,
    difficulty: 'easy',
    requiredTags: [],
    preferredTags: ['recovery', 'light_meal'],
    days: [],
  },
  {
    id: 'operator_budget',
    name: 'Operator Budget',
    description: 'Минимальная стоимость при достаточном белке',
    goalType: 'budget',
    daysCount: 7,
    difficulty: 'easy',
    requiredTags: ['cheap'],
    preferredTags: ['budget', 'cheap'],
    days: [],
  },
];

const byId = new Map(MEAL_PLAN_TEMPLATES.map((t) => [t.id, t]));

export function getMealPlanTemplate(id: string): MealPlanTemplate | undefined {
  return byId.get(id);
}
