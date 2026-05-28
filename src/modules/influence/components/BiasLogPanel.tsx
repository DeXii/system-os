import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterBiasEntryComplete } from '@/core/engines/os-kernel';
import { COGNITIVE_BIAS_CATALOG } from '@/content/influence-protocols';
interface Props {
  onSaved: () => void;
}

export function BiasLogPanel({ onSaved }: Props) {
  const [form, setForm] = useState({
    biasName: COGNITIVE_BIAS_CATALOG[0],
    situation: '',
    correction: '',
    outcome: '',
  });

  const save = async () => {
    if (!form.situation.trim()) return;
    await afterBiasEntryComplete({
      date: todayKey(),
      type: 'bias',
      biasName: form.biasName,
      situation: form.situation,
      correction: form.correction || undefined,
      outcome: form.outcome || undefined,
    });
    setForm({
      biasName: COGNITIVE_BIAS_CATALOG[0],
      situation: '',
      correction: '',
      outcome: '',
    });
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Bias Log · Когнитивное искажение</div>
      <div className="form-row">
        <label className="label">Искажение</label>
        <select
          className="select"
          value={form.biasName}
          onChange={(e) => setForm({ ...form, biasName: e.target.value })}
        >
          {COGNITIVE_BIAS_CATALOG.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="label">Ситуация</label>
        <textarea
          className="textarea"
          value={form.situation}
          onChange={(e) => setForm({ ...form, situation: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Коррекция / контрмера</label>
        <textarea
          className="textarea"
          value={form.correction}
          onChange={(e) => setForm({ ...form, correction: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Исход</label>
        <input
          className="input"
          value={form.outcome}
          onChange={(e) => setForm({ ...form, outcome: e.target.value })}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={!form.situation.trim()}
        onClick={save}
      >
        Записать Bias
      </button>
    </div>
  );
}
