import { useEffect, useState } from 'react';
import { getBodyMetrics, saveBodyMetrics } from '@/core/engines/nutrition-goal-engine';
import type { OperatorBodyMetrics } from '@/core/domain/nutrition-types';

interface Props {
  onSaved: () => void;
}

export function BodyMetricsPanel({ onSaved }: Props) {
  const [form, setForm] = useState({
    weight: '75',
    height: '175',
    age: '25',
    sex: 'male' as 'male' | 'female',
    activityLevel: 'moderate' as OperatorBodyMetrics['activityLevel'],
    trainingDaysPerWeek: '4',
  });

  useEffect(() => {
    void getBodyMetrics().then((m) => {
      if (!m) return;
      setForm({
        weight: String(m.weight),
        height: String(m.height),
        age: String(m.age),
        sex: m.sex ?? 'male',
        activityLevel: m.activityLevel,
        trainingDaysPerWeek: String(m.trainingDaysPerWeek),
      });
    });
  }, []);

  const save = async () => {
    await saveBodyMetrics({
      weight: Number(form.weight),
      height: Number(form.height),
      age: Number(form.age),
      sex: form.sex,
      activityLevel: form.activityLevel,
      trainingDaysPerWeek: Number(form.trainingDaysPerWeek),
    });
    onSaved();
  };

  return (
    <div className="panel">
      <h3>Параметры тела</h3>
      <div className="grid-2">
        <label>
          Вес (кг)
          <input
            className="input"
            value={form.weight}
            onChange={(e) => setForm({ ...form, weight: e.target.value })}
          />
        </label>
        <label>
          Рост (см)
          <input
            className="input"
            value={form.height}
            onChange={(e) => setForm({ ...form, height: e.target.value })}
          />
        </label>
        <label>
          Возраст
          <input
            className="input"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
        </label>
        <label>
          Тренировок/нед
          <input
            className="input"
            value={form.trainingDaysPerWeek}
            onChange={(e) => setForm({ ...form, trainingDaysPerWeek: e.target.value })}
          />
        </label>
      </div>
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => void save()}>
        Сохранить
      </button>
    </div>
  );
}
