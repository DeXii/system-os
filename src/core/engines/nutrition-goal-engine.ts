import { db } from '@/core/db';
import type {
  NutritionGoal,
  NutritionGoalType,
  OperatorBodyMetrics,
} from '@/core/domain/nutrition-types';

const ACTIVITY_MULT: Record<OperatorBodyMetrics['activityLevel'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function computeTdee(body: OperatorBodyMetrics): number {
  const s = body.sex === 'female' ? -161 : 5;
  const bmr = 10 * body.weight + 6.25 * body.height - 5 * body.age + s;
  const mult = ACTIVITY_MULT[body.activityLevel];
  const trainingBonus = 1 + Math.min(body.trainingDaysPerWeek, 6) * 0.02;
  return Math.round(bmr * mult * trainingBonus);
}

export function computeTargets(
  body: OperatorBodyMetrics,
  goalType: NutritionGoalType
): Pick<NutritionGoal, 'targetCalories' | 'targetProtein' | 'targetFats' | 'targetCarbs'> {
  const tdee = computeTdee(body);
  let calories = tdee;
  const proteinPerKg =
    goalType === 'bulk' || goalType === 'performance'
      ? 2
      : goalType === 'cut'
        ? 2.2
        : 1.8;
  const protein = Math.round(body.weight * proteinPerKg);

  if (goalType === 'cut') calories = Math.round(tdee * 0.85);
  else if (goalType === 'bulk') calories = Math.round(tdee * 1.1);
  else if (goalType === 'budget') calories = tdee;

  const fatCals = Math.round(calories * 0.25);
  const fats = Math.round(fatCals / 9);
  const carbCals = calories - protein * 4 - fatCals;
  const carbs = Math.max(0, Math.round(carbCals / 4));

  return {
    targetCalories: calories,
    targetProtein: protein,
    targetFats: fats,
    targetCarbs: carbs,
  };
}

export async function getActiveGoal(): Promise<NutritionGoal | undefined> {
  const goals = await db.nutritionGoals.toArray();
  return goals.find((g) => g.active) ?? goals.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function getBodyMetrics(): Promise<OperatorBodyMetrics | undefined> {
  return db.operatorBodyMetrics.get('body-metrics');
}

export async function saveBodyMetrics(
  patch: Omit<OperatorBodyMetrics, 'id' | 'updatedAt'>
): Promise<OperatorBodyMetrics> {
  const row: OperatorBodyMetrics = {
    id: 'body-metrics',
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.operatorBodyMetrics.put(row);
  return row;
}

export async function saveNutritionGoal(
  goalType: NutritionGoalType,
  body?: OperatorBodyMetrics
): Promise<NutritionGoal> {
  const metrics = body ?? (await getBodyMetrics());
  if (!metrics) throw new Error('Сначала укажите параметры тела');

  const targets = computeTargets(metrics, goalType);
  const now = new Date().toISOString();
  const existing = await getActiveGoal();

  const all = await db.nutritionGoals.toArray();
  for (const g of all) {
    if (g.active) await db.nutritionGoals.update(g.id, { active: false });
  }

  const goal: NutritionGoal = {
    id: existing?.id ?? `goal-${Date.now()}`,
    goalType,
    ...targets,
    active: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.nutritionGoals.put(goal);
  return goal;
}

export function trainingDayCalorieBump(baseCalories: number, isTrainingDay: boolean): number {
  if (!isTrainingDay) return baseCalories;
  return Math.round(baseCalories * 1.08);
}
