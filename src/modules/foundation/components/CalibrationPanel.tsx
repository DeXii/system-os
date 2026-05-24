import { useEffect, useState } from 'react';
import { getCalibration, saveCalibration } from '@/core/engines/workout-planner';
import { emitKernel } from '@/core/events/event-bus';
import type { OperatorCalibration } from '@/core/domain/types';

interface Props {
  onSaved: () => void;
}

export function CalibrationPanel({ onSaved }: Props) {
  const [form, setForm] = useState({ maxPullups: '5', maxDips: '8', plankSec: '45' });
  const [saved, setSaved] = useState<OperatorCalibration | null>(null);

  useEffect(() => {
    getCalibration().then((c) => {
      if (c) {
        setSaved(c);
        setForm({
          maxPullups: String(c.maxPullups),
          maxDips: String(c.maxDips),
          plankSec: String(c.plankSec),
        });
      }
    });
  }, []);

  const submit = async () => {
    const row = await saveCalibration(
      Number(form.maxPullups) || 1,
      Number(form.maxDips) || 1,
      Number(form.plankSec) || 30
    );
    setSaved(row);
    await emitKernel('foundation', 'Калибровка обновлена', 'success');
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Калибровка (турник / брусья)</div>
      <div className="grid-2">
        <div className="form-row">
          <label className="label">Макс. подтягивания</label>
          <input
            className="input"
            value={form.maxPullups}
            onChange={(e) => setForm({ ...form, maxPullups: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Макс. отжимания на брусьях</label>
          <input
            className="input"
            value={form.maxDips}
            onChange={(e) => setForm({ ...form, maxDips: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Планка (сек)</label>
          <input
            className="input"
            value={form.plankSec}
            onChange={(e) => setForm({ ...form, plankSec: e.target.value })}
          />
        </div>
      </div>
      <button type="button" className="btn btn-primary" onClick={submit}>
        Сохранить калибровку
      </button>
      {saved && (
        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
          Обновлено: {new Date(saved.lastUpdated).toLocaleString('ru')}
        </p>
      )}
    </div>
  );
}
