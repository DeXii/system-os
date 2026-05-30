import { TASK_KEYS } from '@/content/task-keys';
import { db, uid } from '../../db';
import type { MealEntry, NutritionGoal, ShoppingList } from '../../domain/types';
import {
  aggregateDay,
  maybeCompleteNutritionReview,
  syncDailyLogNutrition,
} from '../../engines/nutrition-metrics';
import { getActiveGoal } from '../../engines/nutrition-goal-engine';
import { updateNutritionParamsFromDay } from '../../engines/nutrition-params';
import { completeByTaskKey } from '../commands/complete';
import { afterFactWrite } from '../pipeline';

export async function afterNutritionGoalSet(goal: NutritionGoal): Promise<void> {
  await db.nutritionGoals.put(goal);
  await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'nutrition_goal_set' });
}

export async function afterMealLogged(entry: Omit<MealEntry, 'id'>): Promise<MealEntry> {
  const row: MealEntry = { ...entry, id: uid() };
  await db.mealEntries.put(row);
  const day = await aggregateDay(entry.date);
  const goal = await getActiveGoal();
  if (goal) {
    await updateNutritionParamsFromDay(day, goal);
  }
  await syncDailyLogNutrition(entry.date);
  await afterFactWrite({
    type: 'READINESS_INVALIDATED',
    reason: 'meal_logged',
  });
  if (entry.completed) {
    await completeByTaskKey(TASK_KEYS.nutritionLog, entry.date, 'nutrition');
  }
  await maybeCompleteNutritionReview(entry.date);
  return row;
}

export async function afterShoppingListGenerated(list: ShoppingList): Promise<ShoppingList> {
  await db.shoppingLists.put(list);
  await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'shopping_list_generated' });
  return list;
}

export async function afterNutritionPlanUpdated(planId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await completeByTaskKey(TASK_KEYS.nutritionPlanApply, today, 'nutrition');
  await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: `plan_updated:${planId}` });
}

export async function afterRecoveryOpsSaved(
  date: string,
  patch: { sleepHours?: number; hydrationOk?: boolean; nutritionOk?: boolean }
): Promise<void> {
  const existing = await db.dailyLogs.where('date').equals(date).first();
  await syncDailyLogNutrition(date);
  const derived = await db.dailyLogs.where('date').equals(date).first();
  await db.dailyLogs.put({
    id: existing?.id ?? uid(),
    date,
    sleepHours: patch.sleepHours ?? existing?.sleepHours,
    hydrationOk: patch.hydrationOk ?? existing?.hydrationOk,
    nutritionOk: patch.nutritionOk ?? derived?.nutritionOk ?? existing?.nutritionOk,
    stressLevel: existing?.stressLevel,
    notes: existing?.notes,
  });
  await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'recovery_ops' });
  const log = await db.dailyLogs.where('date').equals(date).first();
  if (
    (log?.sleepHours ?? 0) >= 7 &&
    log?.nutritionOk !== false &&
    log?.hydrationOk !== false
  ) {
    await completeByTaskKey(TASK_KEYS.foundationRecovery, date, 'foundation');
  }
}
