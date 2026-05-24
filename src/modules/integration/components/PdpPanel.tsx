import { useEffect, useState } from 'react';
import { db, uid } from '@/core/db';
import { afterPdpSave } from '@/core/engines/os-kernel';
import { PDP_FIELD_HINTS } from '@/content/integration-protocols';
import type { OperatorProfile, PdpMilestone, PersonalDevelopmentPlan, StageId } from '@/core/domain/types';
import { STAGE_LABELS, STAGE_ORDER } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  profile: OperatorProfile;
  onSaved: () => void;
}

export function PdpPanel({ profile, onSaved }: Props) {
  const [form, setForm] = useState({
    northStar: '',
    goalsText: '',
    weeklyFocus: '',
    focusStage: profile.currentStage as StageId,
    milestones: [] as PdpMilestone[],
  });
  const [newMilestone, setNewMilestone] = useState('');

  useEffect(() => {
    db.pdp.toCollection().first().then((row) => {
      if (!row) return;
      setForm({
        northStar: row.northStar ?? '',
        goalsText: row.goals.join('\n'),
        weeklyFocus: row.weeklyFocus ?? '',
        focusStage: row.focusStage ?? profile.currentStage,
        milestones: row.milestones ?? [],
      });
    });
  }, [profile.currentStage]);

  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    setForm((f) => ({
      ...f,
      milestones: [
        ...f.milestones,
        { id: uid(), label: newMilestone.trim(), done: false, stage: f.focusStage },
      ],
    }));
    setNewMilestone('');
  };

  const save = async () => {
    const existing = await db.pdp.toCollection().first();
    const row: PersonalDevelopmentPlan = {
      id: existing?.id ?? uid(),
      quarter: existing?.quarter ?? `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
      goals: form.goalsText.split('\n').filter(Boolean),
      milestones: form.milestones,
      northStar: form.northStar || undefined,
      weeklyFocus: form.weeklyFocus || undefined,
      focusStage: form.focusStage,
    };
    await afterPdpSave(row);
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Personal Development Plan</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          PDP: North Star — долгосрочный вектор; цели квартала; фокус недели и milestone на пути.
        </p>
      </GlossaryZone>
      <div className="form-row">
        <label className="label">{PDP_FIELD_HINTS.northStar}</label>
        <input
          className="input"
          value={form.northStar}
          onChange={(e) => setForm({ ...form, northStar: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">{PDP_FIELD_HINTS.goals}</label>
        <textarea
          className="textarea"
          value={form.goalsText}
          onChange={(e) => setForm({ ...form, goalsText: e.target.value })}
        />
      </div>
      <div className="grid-2">
        <div className="form-row">
          <label className="label">{PDP_FIELD_HINTS.focusStage}</label>
          <select
            className="select"
            value={form.focusStage}
            onChange={(e) =>
              setForm({ ...form, focusStage: e.target.value as StageId })
            }
          >
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="label">{PDP_FIELD_HINTS.weeklyFocus}</label>
          <input
            className="input"
            value={form.weeklyFocus}
            onChange={(e) => setForm({ ...form, weeklyFocus: e.target.value })}
          />
        </div>
      </div>
      <div className="form-row">
        <label className="label">{PDP_FIELD_HINTS.milestone}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
          />
          <button type="button" className="btn btn-sm" onClick={addMilestone}>
            +
          </button>
        </div>
      </div>
      {form.milestones.map((m) => (
        <div key={m.id} className="check-row">
          <input
            type="checkbox"
            checked={m.done}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                milestones: f.milestones.map((x) =>
                  x.id === m.id ? { ...x, done: e.target.checked } : x
                ),
              }))
            }
          />
          <span style={{ fontSize: 13 }}>{m.label}</span>
        </div>
      ))}
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={save}>
        Сохранить PDP (синхрон с профилем)
      </button>
    </div>
  );
}
