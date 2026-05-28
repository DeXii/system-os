import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterDecisionLogComplete } from '@/core/engines/os-kernel';
import {
  closeDecisionFollowUp,
  computeFollowUpDueDate,
  getPendingDecisionFollowUps,
} from '@/core/engines/decision-followup';
import type { DecisionLogEntry } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
  linkedScenarioId?: string;
  defaultTitle?: string;
}

export function DecisionLogPanel({ onSaved, linkedScenarioId, defaultTitle }: Props) {
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [overdue, setOverdue] = useState<DecisionLogEntry[]>([]);
  const [form, setForm] = useState({
    title: defaultTitle ?? '',
    context: '',
    alternatives: '',
    choice: '',
    expectedOutcome: '',
    actualOutcome: '',
    followUpDueDate: computeFollowUpDueDate(),
  });
  const [closeId, setCloseId] = useState('');
  const [closeOutcome, setCloseOutcome] = useState('');

  const load = async () => {
    setLogs(await db.decisionLogs.orderBy('date').reverse().limit(8).toArray());
    setOverdue(await getPendingDecisionFollowUps());
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
      followUpDueDate: form.actualOutcome?.trim()
        ? undefined
        : form.followUpDueDate || computeFollowUpDueDate(),
      linkedScenarioId,
    });
    setForm({
      title: '',
      context: '',
      alternatives: '',
      choice: '',
      expectedOutcome: '',
      actualOutcome: '',
      followUpDueDate: computeFollowUpDueDate(),
    });
    load();
    onSaved();
  };

  const closeFollowUp = async () => {
    if (!closeId || !closeOutcome.trim()) return;
    await closeDecisionFollowUp(closeId, closeOutcome.trim());
    setCloseId('');
    setCloseOutcome('');
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Decision Log</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Фиксируйте решение, прогноз и дату проверки исхода. Закрывайте просроченные прогнозы.
        </p>
      </GlossaryZone>
      {overdue.length > 0 && (
        <div className="alert-banner" style={{ marginBottom: 8 }}>
          Просрочено проверок: {overdue.length}
        </div>
      )}
      {overdue.length > 0 && (
        <div className="form-row" style={{ marginBottom: 12 }}>
          <label className="label">Закрыть прогноз</label>
          <select
            className="select"
            value={closeId}
            onChange={(e) => setCloseId(e.target.value)}
          >
            <option value="">— выбрать —</option>
            {overdue.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} (до {d.followUpDueDate})
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ marginTop: 6 }}
            placeholder="Фактический исход"
            value={closeOutcome}
            onChange={(e) => setCloseOutcome(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ marginTop: 6 }}
            onClick={closeFollowUp}
          >
            Закрыть исход
          </button>
        </div>
      )}
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
      <div className="form-row">
        <label className="label">Проверить исход (дата)</label>
        <input
          type="date"
          className="input"
          value={form.followUpDueDate}
          onChange={(e) => setForm({ ...form, followUpDueDate: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Фактический исход (если уже известен)</label>
        <input
          className="input"
          value={form.actualOutcome}
          onChange={(e) => setForm({ ...form, actualOutcome: e.target.value })}
        />
      </div>
      <button type="button" className="btn btn-primary" onClick={save}>
        Сохранить decision log
      </button>
      <div style={{ marginTop: 12 }}>
        {logs.map((l) => (
          <div key={l.id} className="kernel-line">
            {l.date}: {l.title.slice(0, 50)}
            {!l.actualOutcome && l.followUpDueDate && (
              <span className="tag" style={{ marginLeft: 6 }}>
                check {l.followUpDueDate}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
