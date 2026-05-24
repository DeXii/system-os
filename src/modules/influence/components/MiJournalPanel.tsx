import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterMiEntryComplete } from '@/core/engines/os-kernel';
import { OARS_FIELD_HINTS } from '@/content/influence-protocols';

interface Props {
  onSaved: () => void;
}

export function MiJournalPanel({ onSaved }: Props) {
  const [form, setForm] = useState({
    situation: '',
    openQuestions: '',
    affirmReflect: '',
    summarize: '',
    whatWorked: '',
    outcome: '',
  });

  const canSave =
    form.situation.trim() && form.openQuestions.trim() && form.summarize.trim();

  const save = async () => {
    if (!canSave) return;
    await afterMiEntryComplete({
      date: todayKey(),
      type: 'mi',
      situation: form.situation,
      openQuestions: form.openQuestions,
      affirmReflect: form.affirmReflect || undefined,
      summarize: form.summarize,
      whatWorked: form.whatWorked || undefined,
      outcome: form.outcome || undefined,
    });
    setForm({
      situation: '',
      openQuestions: '',
      affirmReflect: '',
      summarize: '',
      whatWorked: '',
      outcome: '',
    });
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">MI Journal · OARS</div>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        Motivational Interviewing — тактика открытых вопросов оператора.
      </p>
      {(
        [
          ['situation', 'textarea'],
          ['openQuestions', 'textarea'],
          ['affirmReflect', 'textarea'],
          ['summarize', 'textarea'],
          ['whatWorked', 'textarea'],
          ['outcome', 'input'],
        ] as const
      ).map(([key, kind]) => (
        <div key={key} className="form-row">
          <label className="label">{OARS_FIELD_HINTS[key]}</label>
          {kind === 'textarea' ? (
            <textarea
              className="textarea"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ) : (
            <input
              className="input"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={!canSave}
        onClick={save}
      >
        Записать MI
      </button>
    </div>
  );
}
