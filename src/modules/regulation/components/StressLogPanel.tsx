import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterStressLogComplete } from '@/core/engines/os-kernel';
import { RegulationValidationError } from '@/core/kernel/automations/after-regulation';
import { PST_TEMPLATES } from '@/content/regulation-protocols';
import type { StressLogEntry } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

export function StressLogPanel({ onSaved }: Props) {
  const [logs, setLogs] = useState<StressLogEntry[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    trigger: '',
    reaction: '',
    technique: '',
    outcome: '',
    arousalBefore: '6',
    arousalAfter: '4',
    pstSelfTalk: '',
    linkedTechnique: '',
    savePst: false,
    reframing: '',
  });

  const load = async () => {
    setLogs(await db.stressLogs.orderBy('date').reverse().limit(10).toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.trigger.trim()) return;
    setSaveError(null);
    try {
      await afterStressLogComplete(
        {
          date: todayKey(),
          trigger: form.trigger,
          reaction: form.reaction,
          technique: form.technique,
          outcome: form.outcome,
          arousalBefore: Number(form.arousalBefore),
          arousalAfter: Number(form.arousalAfter),
          pstSelfTalk: form.pstSelfTalk || undefined,
          linkedTechnique: form.linkedTechnique || undefined,
        },
        form.savePst && form.pstSelfTalk
          ? {
              pstEntry: {
                date: todayKey(),
                situation: form.trigger,
                selfTalk: form.pstSelfTalk,
                reframing: form.reframing || form.technique,
                outcome: form.outcome,
              },
            }
          : undefined
      );
      setForm({
        trigger: '',
        reaction: '',
        technique: '',
        outcome: '',
        arousalBefore: '6',
        arousalAfter: '4',
        pstSelfTalk: '',
        linkedTechnique: '',
        savePst: false,
        reframing: '',
      });
      load();
      onSaved();
    } catch (e) {
      if (e instanceof RegulationValidationError) {
        setSaveError(e.errors.join('; '));
      } else {
        setSaveError('Не удалось сохранить stress log');
      }
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">Stress Response Log</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Stress log — триггер, реакция и техника; PST помогает при высоком arousal. Recovery zone
          при низком HRV.
        </p>
      </GlossaryZone>
      {saveError && (
        <div className="alert-banner" style={{ borderColor: 'var(--danger)', marginBottom: 8 }}>
          {saveError}
        </div>
      )}
      <div className="form-row">
        <label className="label">Триггер</label>
        <input
          className="input"
          value={form.trigger}
          onChange={(e) => setForm({ ...form, trigger: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Реакция</label>
        <input
          className="input"
          value={form.reaction}
          onChange={(e) => setForm({ ...form, reaction: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Техника</label>
        <input
          className="input"
          value={form.technique}
          onChange={(e) => setForm({ ...form, technique: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Исход</label>
        <input
          className="input"
          value={form.outcome}
          onChange={(e) => setForm({ ...form, outcome: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Arousal до (1–10)</label>
        <input
          type="range"
          min={1}
          max={10}
          value={form.arousalBefore}
          onChange={(e) => setForm({ ...form, arousalBefore: e.target.value })}
        />
        <span style={{ fontSize: 12 }}>{form.arousalBefore}</span>
      </div>
      <div className="form-row">
        <label className="label">Arousal после (1–10)</label>
        <input
          type="range"
          min={1}
          max={10}
          value={form.arousalAfter}
          onChange={(e) => setForm({ ...form, arousalAfter: e.target.value })}
        />
        <span style={{ fontSize: 12 }}>{form.arousalAfter}</span>
      </div>
      <div className="form-row">
        <label className="label">PST — внутренняя речь</label>
        <textarea
          className="input"
          rows={2}
          value={form.pstSelfTalk}
          onChange={(e) => setForm({ ...form, pstSelfTalk: e.target.value })}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {PST_TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              className="btn btn-sm"
              onClick={() => setForm({ ...form, pstSelfTalk: t })}
            >
              +
            </button>
          ))}
        </div>
      </div>
      <label style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={form.savePst}
          onChange={(e) => setForm({ ...form, savePst: e.target.checked })}
        />
        Сохранить отдельную PST-запись (task regulation.pst)
      </label>
      {form.savePst && (
        <div className="form-row">
          <label className="label">Reframing</label>
          <input
            className="input"
            value={form.reframing}
            onChange={(e) => setForm({ ...form, reframing: e.target.value })}
          />
        </div>
      )}
      <button type="button" className="btn btn-primary" onClick={save}>
        Сохранить stress log
      </button>

      <div style={{ marginTop: 12 }}>
        {logs.map((l) => (
          <div key={l.id} className="kernel-line">
            {l.date}: {l.trigger.slice(0, 40)} · arousal {l.arousalBefore ?? '?'}→
            {l.arousalAfter ?? '?'}
          </div>
        ))}
      </div>
    </div>
  );
}
