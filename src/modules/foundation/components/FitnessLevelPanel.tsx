import { useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import {
  FITNESS_TIER_ORDER,
  fitnessTierLabel,
  type FitnessCategory,
  type FitnessTier,
} from '@/core/domain/types';
import { getFitnessLevels, setManualTier } from '@/core/engines/progression-engine';

export function FitnessLevelPanel() {
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof getFitnessLevels>> | null>(null);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    setLevels(await getFitnessLevels());
  };

  useAsyncEffect(
    async (signal) => {
      await load();
      if (signal.aborted) return;
    },
    []
  );

  if (!levels) return null;

  const categories: { key: FitnessCategory; label: string }[] = [
    { key: 'hift', label: 'HIFT' },
    { key: 'gpp', label: 'GPP' },
    { key: 'warmup', label: 'Зарядка' },
    { key: 'stretch', label: 'Растяжка' },
  ];

  const onTierChange = async (cat: FitnessCategory, tier: FitnessTier) => {
    await setManualTier(cat, tier);
    await load();
  };

  return (
    <div className="panel" style={{ marginBottom: '0.75rem' }}>
      <div className="panel-title">Уровень оператора</div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
        Старт: Средний. Корректируется по результатам LIVE и вручную.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {categories.map(({ key, label }) => (
          <span key={key} className="tag">
            {label}: {fitnessTierLabel(levels[key])}
          </span>
        ))}
      </div>
      <button type="button" className="btn btn-sm" onClick={() => setEditing((e) => !e)}>
        {editing ? 'Скрыть' : 'Изменить вручную'}
      </button>
      {editing && (
        <div style={{ marginTop: 12 }}>
          {categories.map(({ key, label }) => (
            <div key={key} className="form-row">
              <label className="label">{label}</label>
              <select
                className="input"
                value={levels[key]}
                onChange={(e) => void onTierChange(key, e.target.value as FitnessTier)}
              >
                {FITNESS_TIER_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {fitnessTierLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
