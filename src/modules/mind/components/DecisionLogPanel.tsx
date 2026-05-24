import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterDecisionLogComplete } from '@/core/engines/os-kernel';
import type { DecisionLogEntry } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
  linkedScenarioId?: string;
  defaultTitle?: string;
}

export function DecisionLogPanel({ onSaved, linkedScenarioId, defaultTitle }: Props) {
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [form, setForm] = useState({
    title: defaultTitle ?? '',
    context: '',
    alternatives: '',
    choice: '',
    expectedOutcome: '',
    actualOutcome: '',
  });

  const load = async () => {
    setLogs(await db.decisionLogs.orderBy('date').reverse().limit(8).toArray());
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (defaultTitle) setForm((f) => ({ ...f, title: defaultTitle }));
  }, [defaultTitle]);

  const save = async () => {
    if (!form.title.trim()) return;
    await afterDecisionLogComplete({
      date: todayKey(),
      title: form.title,
      context: form.context,
      alternatives: form.alternatives,
      choice: form.choice,
      expectedOutcome: form.expectedOutcome,
      actualOutcome: form.actualOutcome || undefined,
      linkedScenarioId,
    });
    setForm({
      title: '',
      context: '',
      alternatives: '',
      choice: '',
      expectedOutcome: '',
      actualOutcome: '',
    });
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Decision Log</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Decision log — фиксируете решение, контекст и исход; можно связать со scenario analysis и
          SWOT.
        </p>
      </GlossaryZone>
      <div className="form-row">
        <label className="label">Решение</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Контекст</label>
        <textarea
          className="textarea"
          value={form.context}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Альтернативы</label>
        <textarea
          className="textarea"
          value={form.alternatives}
          onChange={(e) => setForm({ ...form, alternatives: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Выбор</label>
        <input
          className="input"
          value={form.choice}
          onChange={(e) => setForm({ ...form, choice: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Ожидаемый исход</label>
        <input
          className="input"
          value={form.expectedOutcome}
          onChange={(e) => setForm({ ...form, expectedOutcome: e.target.value })}
        />
      </div>
      <button type="button" className="btn btn-primary" onClick={save}>
        Сохранить decision log
      </button>
      <div style={{ marginTop: 12 }}>
        {logs.map((l) => (
          <div key={l.id} className="kernel-line">
            {l.date}: {l.title.slice(0, 50)}
          </div>
        ))}
      </div>
    </div>
  );
}
