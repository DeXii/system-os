import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import { afterContactSave } from '@/core/engines/os-kernel';
import type { ContactProfile } from '@/core/domain/types';

interface Props {
  onSaved: () => void;
}

const emptyForm = {
  codename: '',
  role: '',
  stakes: '',
  motives: '',
  triggers: '',
  weaknesses: '',
  disclosureNotes: '',
  notes: '',
};

export function ContactsPanel({ onSaved }: Props) {
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setContacts(await db.contacts.orderBy('codename').toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (c: ContactProfile) => {
    setEditId(c.id);
    setForm({
      codename: c.codename,
      role: c.role ?? '',
      stakes: c.stakes ?? '',
      motives: c.motives ?? '',
      triggers: c.triggers ?? '',
      weaknesses: c.weaknesses ?? '',
      disclosureNotes: c.disclosureNotes ?? '',
      notes: c.notes ?? '',
    });
  };

  const save = async () => {
    if (!form.codename.trim()) return;
    await afterContactSave({
      id: editId ?? undefined,
      codename: form.codename.trim(),
      role: form.role || undefined,
      stakes: form.stakes || undefined,
      motives: form.motives || undefined,
      triggers: form.triggers || undefined,
      weaknesses: form.weaknesses || undefined,
      disclosureNotes: form.disclosureNotes || undefined,
      notes: form.notes || undefined,
    });
    setEditId(null);
    setForm(emptyForm);
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Досье · Contacts</div>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        Память на людей: мотивы, ставки, что уже раскрыто оператором.
      </p>
      <div className="form-row">
        <label className="label">Позывной</label>
        <input
          className="input"
          value={form.codename}
          onChange={(e) => setForm({ ...form, codename: e.target.value })}
        />
      </div>
      {(['role', 'stakes', 'motives', 'triggers', 'weaknesses', 'disclosureNotes'] as const).map(
        (key) => (
          <div key={key} className="form-row">
            <label className="label">{key}</label>
            <textarea
              className="textarea"
              rows={2}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        )
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={save}>
        {editId ? 'Обновить досье' : 'Создать досье'}
      </button>
      {editId && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginLeft: 8 }}
          onClick={() => {
            setEditId(null);
            setForm(emptyForm);
          }}
        >
          Отмена
        </button>
      )}
      <ul className="mission-list" style={{ marginTop: 12 }}>
        {contacts.map((c) => (
          <li key={c.id} className="check-row">
            <button type="button" className="btn btn-sm" onClick={() => startEdit(c)}>
              {c.codename}
            </button>
            {c.role && (
              <span className="tag" style={{ marginLeft: 8 }}>
                {c.role}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
