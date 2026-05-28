import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterStudySessionComplete } from '@/core/engines/os-kernel';
import type { StudySession } from '@/core/domain/types';

interface Props {
  onSaved: () => void;
}

export function StudyLogPanel({ onSaved }: Props) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [form, setForm] = useState({
    subject: '',
    durationMin: 30,
    topic: '',
    notes: '',
  });

  const load = async () => {
    setSessions(await db.studySessions.orderBy('date').reverse().limit(6).toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.subject.trim() || !form.topic.trim()) return;
    await afterStudySessionComplete({
      date: todayKey(),
      subject: form.subject.trim(),
      durationMin: form.durationMin,
      topic: form.topic.trim(),
      notes: form.notes || undefined,
    });
    setForm({ subject: '', durationMin: 30, topic: '', notes: '' });
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Study Log · Учёба</div>
      <div className="form-row">
        <label className="label">Предмет / язык</label>
        <input
          className="input"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Тема</label>
        <input
          className="input"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Минут</label>
        <input
          type="number"
          className="input"
          min={5}
          value={form.durationMin}
          onChange={(e) =>
            setForm({ ...form, durationMin: parseInt(e.target.value, 10) || 30 })
          }
        />
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={save}>
        Записать сессию
      </button>
      <div style={{ marginTop: 12 }}>
        {sessions.map((s) => (
          <div key={s.id} className="kernel-line">
            {s.date}: {s.subject} — {s.topic} ({s.durationMin} мин)
          </div>
        ))}
      </div>
    </div>
  );
}
