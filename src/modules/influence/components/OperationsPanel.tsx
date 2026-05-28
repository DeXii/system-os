import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import { afterOperationSave } from '@/core/engines/os-kernel';
import type { ContactProfile, Operation, OperationPhase, OperationStatus } from '@/core/domain/types';

interface Props {
  onSaved: () => void;
}

export function OperationsPanel({ onSaved }: Props) {
  const [ops, setOps] = useState<Operation[]>([]);
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [form, setForm] = useState({
    id: '' as string | undefined,
    title: '',
    goal: '',
    phase: 'active' as OperationPhase,
    status: 'open' as OperationStatus,
    deadline: '',
    contactIds: [] as string[],
    notes: '',
  });

  const load = async () => {
    const all = await db.operations.toArray();
    setOps(
      all.sort((a, b) => {
        if (a.phase === 'closed') return 1;
        if (b.phase === 'closed') return -1;
        return (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');
      })
    );
    setContacts(await db.contacts.toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title.trim() || !form.goal.trim()) return;
    await afterOperationSave({
      id: form.id,
      title: form.title.trim(),
      goal: form.goal.trim(),
      phase: form.phase,
      status: form.status,
      deadline: form.deadline || undefined,
      contactIds: form.contactIds,
      linkedScenarioIds: [],
      linkedDecisionIds: [],
      notes: form.notes || undefined,
    });
    setForm({
      id: undefined,
      title: '',
      goal: '',
      phase: 'active',
      status: 'open',
      deadline: '',
      contactIds: [],
      notes: '',
    });
    load();
    onSaved();
  };

  const toggleContact = (id: string) => {
    setForm((f) => ({
      ...f,
      contactIds: f.contactIds.includes(id)
        ? f.contactIds.filter((x) => x !== id)
        : [...f.contactIds, id],
    }));
  };

  return (
    <div className="panel">
      <div className="panel-title">Операции · Campaigns</div>
      <div className="form-row">
        <label className="label">Название</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Цель</label>
        <textarea
          className="textarea"
          value={form.goal}
          onChange={(e) => setForm({ ...form, goal: e.target.value })}
        />
      </div>
      <div className="grid-2">
        <div className="form-row">
          <label className="label">Фаза</label>
          <select
            className="select"
            value={form.phase}
            onChange={(e) =>
              setForm({ ...form, phase: e.target.value as OperationPhase })
            }
          >
            <option value="planning">planning</option>
            <option value="active">active</option>
            <option value="closed">closed</option>
          </select>
        </div>
        <div className="form-row">
          <label className="label">Дедлайн</label>
          <input
            type="date"
            className="input"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </div>
      </div>
      {contacts.length > 0 && (
        <div className="form-row">
          <label className="label">Контакты</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {contacts.map((c) => (
              <label key={c.id} className="tag" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.contactIds.includes(c.id)}
                  onChange={() => toggleContact(c.id)}
                />{' '}
                {c.codename}
              </label>
            ))}
          </div>
        </div>
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={save}>
        Сохранить операцию
      </button>
      <ul className="mission-list" style={{ marginTop: 12 }}>
        {ops.map((o) => (
          <li key={o.id} className="kernel-line">
            <strong>{o.title}</strong> · {o.phase} · {o.status}
            {o.deadline && ` · до ${o.deadline}`}
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginLeft: 8 }}
              onClick={() =>
                setForm({
                  id: o.id,
                  title: o.title,
                  goal: o.goal,
                  phase: o.phase,
                  status: o.status,
                  deadline: o.deadline ?? '',
                  contactIds: o.contactIds,
                  notes: o.notes ?? '',
                })
              }
            >
              edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
