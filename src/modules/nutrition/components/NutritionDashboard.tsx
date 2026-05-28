import { useEffect, useState } from 'react';

import { db, todayKey } from '@/core/db';

import { getActiveGoal } from '@/core/engines/nutrition-goal-engine';

import { getTodayNutritionDay } from '@/core/engines/nutrition-metrics';

import {
  getMealCompletionBySlot,
  getPlannedMealLabel,
  toggleMealSlot,
} from '@/core/engines/meal-log-service';

import { getActivePlanState } from '@/core/engines/meal-planning-engine';

import type { MealSlot, NutritionGoal } from '@/core/domain/nutrition-types';



const SLOTS: { slot: MealSlot; label: string }[] = [

  { slot: 'breakfast', label: 'Завтрак' },

  { slot: 'lunch', label: 'Обед' },

  { slot: 'dinner', label: 'Ужин' },

  { slot: 'snack', label: 'Перекус' },

];



interface Props {

  reloadToken: number;

  onBump: () => void;

  planDayIndex: number;

}



export function NutritionDashboard({ reloadToken, onBump, planDayIndex }: Props) {

  const [goal, setGoal] = useState<NutritionGoal | null>(null);

  const [day, setDay] = useState({ calories: 0, protein: 0, fats: 0, carbs: 0 });

  const [hydration, setHydration] = useState(true);

  const [completedSlots, setCompletedSlots] = useState<Record<MealSlot, boolean>>({

    breakfast: false,

    lunch: false,

    dinner: false,

    snack: false,

  });

  const [plannedLabels, setPlannedLabels] = useState<Record<MealSlot, string | null>>({

    breakfast: null,

    lunch: null,

    dinner: null,

    snack: null,

  });



  const load = async () => {

    const g = await getActiveGoal();

    setGoal(g ?? null);

    const d = await getTodayNutritionDay();

    setDay(

      d

        ? { calories: d.calories, protein: d.protein, fats: d.fats, carbs: d.carbs }

        : { calories: 0, protein: 0, fats: 0, carbs: 0 }

    );

    const log = await db.dailyLogs.where('date').equals(todayKey()).first();

    setHydration(log?.hydrationOk !== false);



    const date = todayKey();
    setCompletedSlots(await getMealCompletionBySlot(date));



    const plan = await getActivePlanState();

    const dishRows = await db.dishes.toArray();

    const dishes = new Map(dishRows.map((d) => [d.id, d]));

    const labels = { breakfast: null, lunch: null, dinner: null, snack: null } as Record<

      MealSlot,

      string | null

    >;

    if (plan) {

      for (const s of SLOTS) {

        labels[s.slot] = getPlannedMealLabel(plan, dishes, planDayIndex, s.slot);

      }

    }

    setPlannedLabels(labels);

  };



  useEffect(() => {

    void load();

  }, [reloadToken, planDayIndex]);



  const toggleMeal = async (slot: MealSlot) => {

    await toggleMealSlot(todayKey(), slot, planDayIndex);

    await load();

    onBump();

  };



  const proteinPct = goal ? Math.min(100, Math.round((day.protein / goal.targetProtein) * 100)) : 0;

  const calPct = goal ? Math.min(100, Math.round((day.calories / goal.targetCalories) * 100)) : 0;



  return (

    <div>

      <div className="grid-2" style={{ marginBottom: 12 }}>

        <div className="panel">

          <span className="muted">Калории</span>

          <div style={{ fontSize: '1.5rem' }}>

            {day.calories}

            {goal ? ` / ${goal.targetCalories}` : ''}

          </div>

          <div className="progress-bar" style={{ marginTop: 8 }}>

            <div className="progress-fill" style={{ width: `${calPct}%` }} />

          </div>

        </div>

        <div className="panel">

          <span className="muted">Белок</span>

          <div style={{ fontSize: '1.5rem' }}>

            {day.protein}g{goal ? ` / ${goal.targetProtein}g` : ''}

          </div>

          <div className="progress-bar" style={{ marginTop: 8 }}>

            <div className="progress-fill" style={{ width: `${proteinPct}%` }} />

          </div>

          {proteinPct < 50 && goal && (

            <p className="tag warn" style={{ marginTop: 8 }}>

              Дефицит белка

            </p>

          )}

        </div>

      </div>



      <div className="panel">

        <h3>Приёмы пищи сегодня</h3>

        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>

          День плана: {planDayIndex + 1}. Отметка добавляет калории и белок из меню этого дня.

        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {SLOTS.map((s) => (

            <div key={s.slot}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                <button

                  type="button"

                  className={`btn btn-sm ${completedSlots[s.slot] ? 'btn-primary' : ''}`}

                  onClick={() => void toggleMeal(s.slot)}

                >

                  {completedSlots[s.slot] ? '✓' : '○'}

                </button>

                <span>{s.label}</span>

              </div>

              {plannedLabels[s.slot] && (

                <p className="muted" style={{ margin: '4px 0 0 32px', fontSize: '0.85rem' }}>

                  План: {plannedLabels[s.slot]}

                </p>

              )}

            </div>

          ))}

        </div>

        <p className="muted" style={{ marginTop: 8 }}>

          Hydration: {hydration ? 'OK' : '—'} (из Recovery Ops)

        </p>

      </div>

    </div>

  );

}


