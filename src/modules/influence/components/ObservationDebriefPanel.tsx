import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterObservationComplete } from '@/core/engines/os-kernel';
import { OBSERVATION_TYPES } from '@/content/influence-protocols';
import type { InfluenceEntryType } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

export function ObservationDebriefPanel({ onSaved }: Props) {
  const [form, setForm] = useState({
    type: 'observation' as InfluenceEntryType,
    context: '',
    outcome: '',
  });

  const save = async () => {
    if (!form.context.trim()) return;
    await afterObservationComplete({
      date: todayKey(),
      type: form.type === 'debrief' ? 'debrief' : 'observation',
      context: form.context,
      outcome: form.outcome || undefined,
    });
    setForm({ type: 'observation', context: '', outcome: '' });
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Observation / Debrief</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Observation — факты без советов; observation debrief — разбор увиденного. Отдельно от MI и
          nudge.
        </p>
      </GlossaryZone>
      <div className="form-row">
        <label className="label">Тип</label>
        <select
          className="select"
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as InfluenceEntryType })
          }
        >
          {OBSERVATION_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="label">Контекст / наблюдения</label>
        <textarea
          className="textarea"
          value={form.context}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Исход / вывод</label>
        <input
          className="input"
          value={form.outcome}
          onChange={(e) => setForm({ ...form, outcome: e.target.value })}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={!form.context.trim()}
        onClick={save}
      >
        Записать
      </button>
    </div>
  );
}
