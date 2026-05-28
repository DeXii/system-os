import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterMiEntryComplete } from '@/core/engines/os-kernel';
import { OARS_FIELD_HINTS } from '@/content/influence-protocols';
import { ContactSelect } from './ContactSelect';

interface Props {
  onSaved: () => void;
}

export function MiJournalPanel({ onSaved }: Props) {
  const [form, setForm] = useState({
    contactId: '',
    maskUsed: '',
    infoDisclosed: '',
    infoHeld: '',
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
      contactId: form.contactId || undefined,
      maskUsed: form.maskUsed || undefined,
      infoDisclosed: form.infoDisclosed || undefined,
      infoHeld: form.infoHeld || undefined,
      situation: form.situation,
      openQuestions: form.openQuestions,
      affirmReflect: form.affirmReflect || undefined,
      summarize: form.summarize,
      whatWorked: form.whatWorked || undefined,
      outcome: form.outcome || undefined,
    });
    setForm({
      contactId: '',
      maskUsed: '',
      infoDisclosed: '',
      infoHeld: '',
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
      <div className="form-row">
        <label className="label">Контакт</label>
        <ContactSelect
          value={form.contactId}
          onChange={(id) => setForm({ ...form, contactId: id })}
        />
      </div>
      <div className="form-row">
        <label className="label">Маска</label>
        <input
          className="input"
          value={form.maskUsed}
          onChange={(e) => setForm({ ...form, maskUsed: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Раскрыто</label>
        <input
          className="input"
          value={form.infoDisclosed}
          onChange={(e) => setForm({ ...form, infoDisclosed: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Удержано</label>
        <input
          className="input"
          value={form.infoHeld}
          onChange={(e) => setForm({ ...form, infoHeld: e.target.value })}
        />
      </div>
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
