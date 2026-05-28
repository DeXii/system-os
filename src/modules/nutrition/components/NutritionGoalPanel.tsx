import { useEffect, useState } from 'react';
import {
  computeTargets,
  getActiveGoal,
  getBodyMetrics,
  saveNutritionGoal,
} from '@/core/engines/nutrition-goal-engine';
import { afterNutritionGoalSet } from '@/core/kernel/automations/after-nutrition';
import type { NutritionGoalType } from '@/core/domain/nutrition-types';

const GOALS: { id: NutritionGoalType; label: string }[] = [
  { id: 'bulk', label: 'Набор массы' },
  { id: 'cut', label: 'Сушка' },
  { id: 'maintain', label: 'Поддержание' },
  { id: 'performance', label: 'Performance' },
  { id: 'recovery', label: 'Восстановление' },
  { id: 'budget', label: 'Бюджет' },
];

interface Props {
  onSaved: () => void;
}

export function NutritionGoalPanel({ onSaved }: Props) {
  const [selected, setSelected] = useState<NutritionGoalType>('maintain');
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    void getActiveGoal().then((g) => {
      if (g) setSelected(g.goalType);
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const body = await getBodyMetrics();
      if (!body) {
        setPreview('Укажите параметры тела');
        return;
      }
      const t = computeTargets(body, selected);
      setPreview(`${t.targetCalories} kcal · Б ${t.targetProtein} · Ж ${t.targetFats} · У ${t.targetCarbs}`);
    })();
  }, [selected]);

  const save = async () => {
    const goal = await saveNutritionGoal(selected);
    await afterNutritionGoalSet(goal);
    onSaved();
  };

  return (
    <div className="panel">
      <h3>Цель питания</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`btn btn-sm ${selected === g.id ? 'btn-primary' : ''}`}
            onClick={() => setSelected(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="muted">{preview}</p>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
        Применить цель
      </button>
    </div>
  );
}
