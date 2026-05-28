import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import type { Dish, DishIngredient, Ingredient } from '@/core/domain/nutrition-types';
import { assignDishTags } from '@/core/nutrition/import/tag-dish';
import { uid } from '@/core/db';

interface Props {
  onBump: () => void;
}

export function MealBuilderPanel({ onBump }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState('Моё блюдо');
  const [selected, setSelected] = useState<DishIngredient[]>([]);
  const [totals, setTotals] = useState({ cal: 0, p: 0, cost: 0 });

  useEffect(() => {
    void db.ingredients.toArray().then(setIngredients);
  }, []);

  useEffect(() => {
    let cal = 0;
    let p = 0;
    let cost = 0;
    for (const di of selected) {
      if (!di.amount) continue;
      const ing = ingredients.find((i) => i.id === di.ingredientId);
      if (!ing) continue;
      const grams = di.unit === 'pcs' ? 50 * di.amount : di.amount;
      cal += ((ing.caloriesPer100g ?? 0) * grams) / 100;
      p += ((ing.proteinPer100g ?? 0) * grams) / 100;
      cost += grams * 0.002;
    }
    setTotals({ cal: Math.round(cal), p: Math.round(p), cost: Math.round(cost) });
  }, [selected, ingredients]);

  const addIng = (id: string) => {
    setSelected((s) => [...s, { ingredientId: id, amount: 100, unit: 'g' }]);
  };

  const save = async () => {
    const ingMap = new Map(ingredients.map((i) => [i.id, i]));
    let dish: Dish = {
      id: `custom_${uid()}`,
      name,
      ingredients: selected,
      servings: 1,
      totalCalories: totals.cal,
      totalProtein: totals.p,
      tags: [],
      primaryTags: [],
      source: 'user',
      region: 'ru',
      cookTimeMin: 20,
      estimatedCostRub: totals.cost,
    };
    dish = assignDishTags(dish, ingMap);
    await db.customDishes.put(dish);
    onBump();
  };

  return (
    <div className="panel">
      <h3>Meal Builder</h3>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
      <p>
        Итого: {totals.cal} kcal · {totals.p}g protein · ~{totals.cost} ₽
      </p>
      <div style={{ maxHeight: 120, overflow: 'auto', marginBottom: 8 }}>
        {ingredients.slice(0, 30).map((i) => (
          <button
            key={i.id}
            type="button"
            className="btn btn-sm"
            style={{ margin: 2 }}
            onClick={() => addIng(i.id)}
          >
            + {i.name}
          </button>
        ))}
      </div>
      <ul>
        {selected.map((s, idx) => (
          <li key={idx}>
            {ingredients.find((i) => i.id === s.ingredientId)?.name} {s.amount}
            {s.unit}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
        Сохранить блюдо
      </button>
    </div>
  );
}
