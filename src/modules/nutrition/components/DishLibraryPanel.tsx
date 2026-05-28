import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import { DISH_TAG_LABELS } from '@/core/domain/nutrition-types';
import type { Dish, DishTag, Ingredient } from '@/core/domain/nutrition-types';
import { searchDishes } from '@/core/nutrition/data/local-search-index';
import { formatIngredientLine } from './format-ingredient-line';

const QUICK_FILTERS: { tags: DishTag[]; label: string }[] = [
  { tags: ['ru_basic'], label: 'RU базовые' },
  { tags: ['sports_food'], label: 'Спорт' },
  { tags: ['cheap'], label: 'Дёшево' },
  { tags: ['high_protein'], label: 'High protein' },
];

export function DishLibraryPanel() {
  const [all, setAll] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Map<string, Ingredient>>(new Map());
  const [filtered, setFiltered] = useState<Dish[]>([]);
  const [q, setQ] = useState('');
  const [activeTags, setActiveTags] = useState<DishTag[]>([]);

  useEffect(() => {
    void Promise.all([db.dishes.toArray(), db.ingredients.toArray()]).then(([dishes, ings]) => {
      setAll(dishes);
      setIngredients(new Map(ings.map((i) => [i.id, i])));
    });
  }, []);

  useEffect(() => {
    setFiltered(searchDishes(all, q, activeTags.length ? activeTags : undefined));
  }, [all, q, activeTags]);

  return (
    <div className="panel">
      <h3>Dish Library</h3>
      <input
        className="input"
        placeholder="Поиск блюд…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 8, width: '100%' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`btn btn-sm ${f.tags.every((t) => activeTags.includes(t)) ? 'btn-primary' : ''}`}
            onClick={() => {
              const on = f.tags.every((t) => activeTags.includes(t));
              if (on) setActiveTags((prev) => prev.filter((t) => !f.tags.includes(t)));
              else setActiveTags((prev) => [...new Set([...prev, ...f.tags])]);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="muted">{filtered.length} / {all.length} блюд</p>
      <div style={{ maxHeight: 420, overflow: 'auto' }}>
        {filtered.slice(0, 60).map((d) => (
          <div key={d.id} style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <strong>{d.name}</strong>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {d.primaryTags.map((t) => (
                <span key={t} className="tag">
                  {DISH_TAG_LABELS[t]}
                </span>
              ))}
            </div>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              {d.totalProtein}g protein · {d.totalCalories} kcal · {d.cookTimeMin} мин
            </p>
            {d.ingredients.length > 0 && (
              <ul
                className="muted"
                style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: '0.8rem', listStyle: 'disc' }}
              >
                {d.ingredients
                  .filter((di) => !di.optional && di.amount != null)
                  .slice(0, 5)
                  .map((di) => (
                    <li key={di.ingredientId}>{formatIngredientLine(di, ingredients)}</li>
                  ))}
                {d.ingredients.filter((di) => !di.optional && di.amount != null).length > 5 && (
                  <li>…</li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
