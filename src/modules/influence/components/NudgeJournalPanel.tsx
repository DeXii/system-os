import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterNudgeEntryComplete } from '@/core/engines/os-kernel';
import { NUDGE_TYPES } from '@/content/influence-protocols';
import type { NudgeType } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

export function NudgeJournalPanel({ onSaved }: Props) {
  const [form, setForm] = useState({
    context: '',
    nudgeType: 'default' as NudgeType,
    outcome: '',
  });

  const save = async () => {
    if (!form.context.trim()) return;
    await afterNudgeEntryComplete({
      date: todayKey(),
      type: 'nudge',
      context: form.context,
      nudgeType: form.nudgeType,
      outcome: form.outcome || undefined,
    });
    setForm({ context: '', nudgeType: 'default', outcome: '' });
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Nudge Journal</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Nudge journal — мягкий толчок в контексте; оператор проектирует выбор без давления (MI и
          ethics protocol рядом).
        </p>
      </GlossaryZone>
      <div className="form-row">
        <label className="label">Контекст</label>
        <textarea
          className="textarea"
          value={form.context}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Тип nudge</label>
        <select
          className="select"
          value={form.nudgeType}
          onChange={(e) =>
            setForm({ ...form, nudgeType: e.target.value as NudgeType })
          }
        >
          {NUDGE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
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
        disabled={!form.context.trim()}
        onClick={save}
      >
        Записать Nudge
      </button>
    </div>
  );
}
