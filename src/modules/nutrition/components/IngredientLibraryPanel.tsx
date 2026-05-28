import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import { INGREDIENT_CATEGORY_LABELS } from '@/core/domain/nutrition-types';
import type { Ingredient, IngredientCategory } from '@/core/domain/nutrition-types';
import { searchIngredients } from '@/core/nutrition/data/local-search-index';

interface Props {
  highlightIds?: Set<string>;
  planDayIndex?: number;
}

export function IngredientLibraryPanel({ highlightIds, planDayIndex = 0 }: Props) {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<IngredientCategory | ''>('');

  useEffect(() => {
    void db.ingredients.toArray().then((rows) => {
      setItems(searchIngredients(rows, q, cat || undefined));
    });
  }, [q, cat]);

  const highlightCount = highlightIds?.size ?? 0;

  return (
    <div className="panel">
      <h3>Ingredient Library</h3>
      {highlightCount > 0 && (
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
          Подсвечены продукты из плана на сегодня (день {planDayIndex + 1}): {highlightCount}
        </p>
      )}
      <input
        className="input"
        placeholder="Поиск…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 8, width: '100%' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        <button
          type="button"
          className={`btn btn-sm ${!cat ? 'btn-primary' : ''}`}
          onClick={() => setCat('')}
        >
          Все
        </button>
        {(Object.keys(INGREDIENT_CATEGORY_LABELS) as IngredientCategory[]).map((c) => (
          <button
            key={c}
            type="button"
            className={`btn btn-sm ${cat === c ? 'btn-primary' : ''}`}
            onClick={() => setCat(c)}
          >
            {INGREDIENT_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <p className="muted">{items.length} ингредиентов</p>
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {items.slice(0, 80).map((i) => {
          const inPlan = highlightIds?.has(i.id);
          return (
            <div
              key={i.id}
              style={{
                padding: '6px 8px',
                borderBottom: '1px solid var(--border)',
                borderLeft: inPlan ? '3px solid var(--accent)' : undefined,
                background: inPlan ? 'rgba(var(--accent-rgb, 100, 140, 255), 0.08)' : undefined,
              }}
            >
              <strong>{i.name}</strong>
              {inPlan && (
                <span className="tag" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                  В плане сегодня
                </span>
              )}
              <span className="muted">
                {' '}
                · {i.proteinPer100g}g P / 100g · {INGREDIENT_CATEGORY_LABELS[i.category]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
