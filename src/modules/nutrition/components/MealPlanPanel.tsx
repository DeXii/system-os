import { useEffect, useState } from 'react';

import { MEAL_PLAN_TEMPLATES } from '@/content/nutrition/meal-plans';

import { db } from '@/core/db';

import {

  applyMealPlanTemplate,

  getActivePlanState,

  getDayMenu,

  planNeedsRecalc,

} from '@/core/engines/meal-planning-engine';

import { generateShoppingList, getActiveShoppingList } from '@/core/engines/shopping-list-service';

import { getShoppingListSummary } from '@/core/engines/shopping-list-engine';

import { afterNutritionPlanUpdated } from '@/core/kernel/automations/after-nutrition';

import type { Dish, Ingredient, NutritionPlanState } from '@/core/domain/nutrition-types';

import { MealCompositionBlock } from './MealCompositionBlock';



interface Props {
  reloadToken: number;
  onBump: () => void;
  onOpenShopping: () => void;
  activePlanDayIndex: number;
}

export function MealPlanPanel({
  reloadToken,
  onBump,
  onOpenShopping,
  activePlanDayIndex,
}: Props) {

  const [plan, setPlan] = useState<NutritionPlanState | null>(null);

  const [dishes, setDishes] = useState<Map<string, Dish>>(new Map());

  const [ingredients, setIngredients] = useState<Map<string, Ingredient>>(new Map());

  const [summary, setSummary] = useState<string | null>(null);

  const [shoppingDays, setShoppingDays] = useState<number | null>(null);

  const [stale, setStale] = useState(false);

  const [dayIndex, setDayIndex] = useState(0);



  const load = async () => {

    const p = await getActivePlanState();

    setPlan(p ?? null);

    if (p && dayIndex >= p.days.length) setDayIndex(0);



    const [dishRows, ingRows] = await Promise.all([

      db.dishes.toArray(),

      db.ingredients.toArray(),

    ]);

    setDishes(new Map(dishRows.map((d) => [d.id, d])));

    setIngredients(new Map(ingRows.map((i) => [i.id, i])));



    if (p) {

      const list = await getActiveShoppingList(p.id);

      setStale(planNeedsRecalc(p, list?.updatedAt));

      if (list) {

        const s = getShoppingListSummary(list.items);

        setShoppingDays(list.daysCount);

        setSummary(

          `Список закупок: ${s.totalItems} поз. на ${list.daysCount} дн. · ${s.needToBuyCount} купить · ${s.alreadyHaveCount} дома`

        );

      } else {

        setShoppingDays(null);

        setSummary(null);

      }

    } else {

      setShoppingDays(null);

      setSummary(null);

    }

  };



  useEffect(() => {
    void load();
  }, [reloadToken]);

  useEffect(() => {
    setDayIndex(activePlanDayIndex);
  }, [activePlanDayIndex]);



  const apply = async (templateId: string) => {

    const state = await applyMealPlanTemplate(templateId);

    await afterNutritionPlanUpdated(state.id);

    setDayIndex(0);

    await load();

    onBump();

  };



  const genShopping = async () => {

    if (!plan) return;

    await generateShoppingList(plan.id);

    await load();

    onOpenShopping();

  };



  const dayMenu = plan ? getDayMenu(plan, dayIndex, dishes) : [];

  const planDays = plan?.days.length ?? 7;



  return (

    <div>

      <div className="panel" style={{ marginBottom: 12 }}>

        <h3>Шаблоны планов</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {MEAL_PLAN_TEMPLATES.map((t) => (

            <div

              key={t.id}

              style={{

                display: 'flex',

                justifyContent: 'space-between',

                alignItems: 'center',

                gap: 8,

              }}

            >

              <div>

                <strong>{t.name}</strong>

                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>

                  {t.description} · {t.daysCount} дн.

                </p>

              </div>

              <button type="button" className="btn btn-sm" onClick={() => void apply(t.id)}>

                Выбрать

              </button>

            </div>

          ))}

        </div>

      </div>



      {plan && (

        <div className="panel">

          <h3>Активный план: {plan.title}</h3>

          {stale && (

            <p className="tag warn">План изменён — пересчитайте список закупок</p>

          )}

          {summary && <p className="muted">{summary}</p>}

          {!summary && shoppingDays == null && (

            <p className="muted">

              Список закупок ещё не сформирован — будет на {plan.days.length} дн. плана

            </p>

          )}

          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>

            Ниже — готовые блюда и полный состав (ингредиенты). Список покупок суммирует те же

            продукты за все дни плана.

          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>

            <button type="button" className="btn btn-primary btn-sm" onClick={() => void genShopping()}>

              Сформировать список закупок

            </button>

          </div>



          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>

            {Array.from({ length: planDays }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`btn btn-sm ${dayIndex === i ? 'btn-primary' : ''}`}
                onClick={() => setDayIndex(i)}
              >
                День {i + 1}
                {i === activePlanDayIndex && (
                  <span className="tag" style={{ marginLeft: 6, fontSize: '0.7rem' }}>
                    Сегодня
                  </span>
                )}
              </button>
            ))}

          </div>



          <h4>День {dayIndex + 1}</h4>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>

            {dayMenu.map(({ meal, dishes: mealDishes }) => (

              <MealCompositionBlock

                key={meal.slot}

                slot={meal.slot}

                dishes={mealDishes}

                ingredients={ingredients}

              />

            ))}

          </ul>

        </div>

      )}

    </div>

  );

}


