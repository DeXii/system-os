import { useEffect, useState } from 'react';
import { INGREDIENT_CATEGORY_LABELS } from '@/core/domain/nutrition-types';
import type { IngredientCategory, ShoppingList, ShoppingListItem } from '@/core/domain/nutrition-types';
import { getActivePlanState } from '@/core/engines/meal-planning-engine';
import {
  clearPurchasedItems,
  generateShoppingList,
  getActiveShoppingList,
  recalculateShoppingList,
  toggleShoppingListItem,
} from '@/core/engines/shopping-list-service';
import { getShoppingListSummary, groupItemsByCategory } from '@/core/engines/shopping-list-engine';

interface Props {
  reloadToken: number;
  onBump: () => void;
  todayIngredientIds?: Set<string>;
}

export function ShoppingListPanel({ reloadToken, onBump, todayIngredientIds }: Props) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof getShoppingListSummary> | null>(null);

  const load = async () => {
    const plan = await getActivePlanState();
    if (!plan) {
      setList(null);
      return;
    }
    const l = await getActiveShoppingList(plan.id);
    setList(l ?? null);
    if (l) setSummary(getShoppingListSummary(l.items));
  };

  useEffect(() => {
    void load();
  }, [reloadToken]);

  const generate = async () => {
    const plan = await getActivePlanState();
    if (!plan) return;
    await generateShoppingList(plan.id);
    await load();
    onBump();
  };

  const recalc = async () => {
    if (!list) return;
    await recalculateShoppingList(list.id);
    await load();
  };

  const toggle = async (ingredientId: string, field: 'checked' | 'alreadyHave') => {
    if (!list) return;
    await toggleShoppingListItem(list.id, ingredientId, field);
    await load();
  };

  if (!list) {
    return (
      <div className="panel">
        <p className="muted">Выберите meal plan и сформируйте список.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void generate()}>
          Сформировать из плана
        </button>
      </div>
    );
  }

  const need = list.items.filter((i) => !i.alreadyHave && !i.checked);
  const have = list.items.filter((i) => i.alreadyHave);
  const bought = list.items.filter((i) => i.checked && !i.alreadyHave);

  return (
    <div>
      {summary && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <strong>
            {summary.totalItems} поз. · {summary.needToBuyCount} купить · {summary.alreadyHaveCount}{' '}
            дома
          </strong>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
            На {list.daysCount} дн. плана — ингредиенты суммируются по всем дням и всем блюдам.
          </p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" className="btn btn-sm" onClick={() => void recalc()}>
          Пересчитать
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void clearPurchasedItems(list.id).then(load)}
        >
          Очистить купленное
        </button>
      </div>

      <Section title="Нужно купить" items={need} onToggle={toggle} highlightIds={todayIngredientIds} />
      <Section title="Уже есть" items={have} onToggle={toggle} muted highlightIds={todayIngredientIds} />
      <Section title="Куплено" items={bought} onToggle={toggle} highlightIds={todayIngredientIds} />
    </div>
  );
}

function Section({
  title,
  items,
  onToggle,
  muted,
  highlightIds,
}: {
  title: string;
  items: ShoppingListItem[];
  onToggle: (id: string, field: 'checked' | 'alreadyHave') => void;
  muted?: boolean;
  highlightIds?: Set<string>;
}) {
  if (!items.length) return null;
  const grouped = groupItemsByCategory(items);
  return (
    <div className="panel" style={{ marginBottom: 12, opacity: muted ? 0.7 : 1 }}>
      <h3>{title}</h3>
      {(Object.keys(grouped) as IngredientCategory[]).map((cat) => {
        const catItems = grouped[cat];
        if (!catItems.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 8 }}>
            <h4 style={{ fontSize: '0.9rem' }}>{INGREDIENT_CATEGORY_LABELS[cat]}</h4>
            {catItems.map((i) => {
              const today = highlightIds?.has(i.ingredientId);
              return (
                <div
                  key={i.ingredientId}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    borderLeft: today ? '2px solid var(--accent)' : undefined,
                    paddingLeft: today ? 6 : 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={i.checked}
                    onChange={() => onToggle(i.ingredientId, 'checked')}
                  />
                  <input
                    type="checkbox"
                    title="Уже есть"
                    checked={i.alreadyHave}
                    onChange={() => onToggle(i.ingredientId, 'alreadyHave')}
                  />
                  <span>
                    {i.name} — {Math.round(i.totalAmount)}
                    {i.unit}
                    {today && (
                      <span className="muted" style={{ fontSize: '0.75rem' }}>
                        {' '}
                        · сегодня в плане
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
