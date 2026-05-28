import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterTriggerLogComplete } from '@/core/engines/os-kernel';
import type { TriggerLog } from '@/core/domain/types';

interface Props {
  onSaved: () => void;
}

export function TriggerLogPanel({ onSaved }: Props) {
  const [logs, setLogs] = useState<TriggerLog[]>([]);
  const [form, setForm] = useState({
    situation: '',
    bodyReaction: '',
    actionTaken: '',
    maskScore: 3,
  });

  const load = async () => {
    setLogs(await db.triggerLogs.orderBy('date').reverse().limit(6).toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.situation.trim()) return;
    await afterTriggerLogComplete({
      date: todayKey(),
      situation: form.situation,
      bodyReaction: form.bodyReaction,
      actionTaken: form.actionTaken,
      maskScore: form.maskScore,
    });
    setForm({ situation: '', bodyReaction: '', actionTaken: '', maskScore: 3 });
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Trigger Log · Белая комната</div>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        Ситуация → реакция тела → действие → оценка маски (1–5).
      </p>
      <div className="form-row">
        <label className="label">Ситуация</label>
        <textarea
          className="textarea"
          value={form.situation}
          onChange={(e) => setForm({ ...form, situation: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Реакция тела</label>
        <input
          className="input"
          value={form.bodyReaction}
          onChange={(e) => setForm({ ...form, bodyReaction: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Действие</label>
        <input
          className="input"
          value={form.actionTaken}
          onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Маска сохранена (1–5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={form.maskScore}
          onChange={(e) =>
            setForm({ ...form, maskScore: parseInt(e.target.value, 10) })
          }
        />
        <span className="tag">{form.maskScore}</span>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={save}>
        Записать триггер
      </button>
      <div style={{ marginTop: 12 }}>
        {logs.map((l) => (
          <div key={l.id} className="kernel-line">
            {l.date}: маска {l.maskScore}/5 — {l.situation.slice(0, 40)}
          </div>
        ))}
      </div>
    </div>
  );
}
