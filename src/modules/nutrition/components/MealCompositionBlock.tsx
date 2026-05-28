import type { Dish, Ingredient, MealSlot } from '@/core/domain/nutrition-types';
import { formatIngredientLine } from './format-ingredient-line';

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

interface Props {
  slot: MealSlot;
  dishes: Dish[];
  ingredients: Map<string, Ingredient>;
}

export function MealCompositionBlock({ slot, dishes, ingredients }: Props) {
  const totalP = dishes.reduce((s, d) => s + (d.totalProtein ?? 0), 0);
  const totalCal = dishes.reduce((s, d) => s + (d.totalCalories ?? 0), 0);

  return (
    <li style={{ marginBottom: 12 }}>
      <strong>{SLOT_LABELS[slot]}</strong>
      {!dishes.length ? (
        <span className="muted"> — нет блюд</span>
      ) : (
        <ul style={{ margin: '6px 0 0', paddingLeft: 16, listStyle: 'none' }}>
          {dishes.map((d) => (
            <li key={d.id} style={{ marginBottom: 8 }}>
              <div>
                <strong>{d.name}</strong>
                <span className="muted">
                  {' '}
                  — {d.totalProtein ?? 0}g · {d.totalCalories ?? 0} kcal
                </span>
              </div>
              {d.ingredients.length > 0 && (
                <ul
                  className="muted"
                  style={{
                    margin: '4px 0 0',
                    paddingLeft: 16,
                    fontSize: '0.85rem',
                    listStyle: 'disc',
                  }}
                >
                  {d.ingredients
                    .filter((di) => !di.optional && di.amount != null)
                    .map((di) => (
                      <li key={`${d.id}-${di.ingredientId}`}>
                        {formatIngredientLine(di, ingredients)}
                      </li>
                    ))}
                </ul>
              )}
            </li>
          ))}
          {dishes.length > 1 && (
            <li className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Итого приём: {totalP}g белка · {totalCal} kcal
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
