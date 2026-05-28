import { useCallback, useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import type { NutritionPlanState } from '@/core/domain/nutrition-types';
import { getActivePlanState } from '@/core/engines/meal-planning-engine';
import {
  collectIngredientIdsForPlanDay,
  getCurrentPlanDayIndex,
} from '@/core/engines/meal-log-service';

export function useNutritionPlanDay(reloadToken: number) {
  const [plan, setPlan] = useState<NutritionPlanState | null>(null);
  const [planDayIndex, setPlanDayIndex] = useState(0);
  const [todayIngredientIds, setTodayIngredientIds] = useState<Set<string>>(new Set());
  const [calendarDayKey, setCalendarDayKey] = useState(todayKey());

  const refresh = useCallback(async () => {
    const today = todayKey();
    setCalendarDayKey(today);

    const p = await getActivePlanState();
    setPlan(p ?? null);

    if (!p) {
      setPlanDayIndex(0);
      setTodayIngredientIds(new Set());
      return;
    }

    const dayIdx = getCurrentPlanDayIndex(p, today);
    setPlanDayIndex(dayIdx);

    const dishRows = await db.dishes.toArray();
    const dishes = new Map(dishRows.map((d) => [d.id, d]));
    setTodayIngredientIds(collectIngredientIdsForPlanDay(p, dishes, dayIdx));
  }, []);

  useEffect(() => {
    void refresh();
  }, [reloadToken, refresh]);

  useEffect(() => {
    const tick = () => {
      const today = todayKey();
      if (today !== calendarDayKey) void refresh();
    };
    const id = window.setInterval(tick, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [calendarDayKey, refresh]);

  return { plan, planDayIndex, todayIngredientIds, calendarDayKey, refresh };
}
