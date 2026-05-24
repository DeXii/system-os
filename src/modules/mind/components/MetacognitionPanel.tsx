import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterReflectionComplete } from '@/core/engines/os-kernel';
import { COGNITIVE_BIAS_HINTS } from '@/content/mind-protocols';
import type { ReflectionEntry, ReflectionMode } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

export function MetacognitionPanel({ onSaved }: Props) {
  const [template, setTemplate] = useState<'pmr' | 'ooda'>('pmr');
  const [mode, setMode] = useState<ReflectionMode>('pmr_short');
  const [recent, setRecent] = useState<ReflectionEntry[]>([]);
  const [pmr, setPmr] = useState({ plan: '', monitor: '', reflect: '' });
  const [ooda, setOoda] = useState({ observe: '', orient: '', decide: '', act: '' });

  const load = async () => {
    setRecent(await db.reflections.orderBy('date').reverse().limit(5).toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (template === 'pmr') {
      if (!pmr.reflect.trim()) return;
      await afterReflectionComplete({
        date: todayKey(),
        mode,
        plan: pmr.plan,
        monitor: pmr.monitor,
        reflect: pmr.reflect,
      });
      setPmr({ plan: '', monitor: '', reflect: '' });
    } else {
      if (!ooda.act.trim() && !ooda.decide.trim()) return;
      await afterReflectionComplete({
        date: todayKey(),
        mode: 'ooda',
        plan: '',
        monitor: '',
        reflect: ooda.act,
        observe: ooda.observe,
        orient: ooda.orient,
        decide: ooda.decide,
        act: ooda.act,
      });
      setOoda({ observe: '', orient: '', decide: '', act: '' });
    }
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Metacognition — PMR / OODA</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Metacognition: PMR — релаксация тела; OODA — цикл observe, orient, decide, act. Reflection
          сохраняется в журнал mind.
        </p>
      </GlossaryZone>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className={`btn btn-sm ${template === 'pmr' ? 'btn-primary' : ''}`}
          onClick={() => setTemplate('pmr')}
        >
          PMR
        </button>
        <button
          type="button"
          className={`btn btn-sm ${template === 'ooda' ? 'btn-primary' : ''}`}
          onClick={() => setTemplate('ooda')}
        >
          OODA
        </button>
      </div>
      {template === 'pmr' && (
        <>
          <div className="form-row">
            <label className="label">Режим</label>
            <select
              className="select"
              value={mode}
              onChange={(e) => setMode(e.target.value as ReflectionMode)}
            >
              <option value="pmr_short">Короткий (ежедневный)</option>
              <option value="pmr_extended">Расширенный (по событию)</option>
            </select>
          </div>
          <div className="form-row">
            <label className="label">Plan</label>
            <input
              className="input"
              value={pmr.plan}
              onChange={(e) => setPmr({ ...pmr, plan: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="label">Monitor</label>
            <input
              className="input"
              value={pmr.monitor}
              onChange={(e) => setPmr({ ...pmr, monitor: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="label">Reflect</label>
            <textarea
              className="textarea"
              value={pmr.reflect}
              onChange={(e) => setPmr({ ...pmr, reflect: e.target.value })}
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Bias: {COGNITIVE_BIAS_HINTS.join(' · ')}
          </p>
        </>
      )}
      {template === 'ooda' && (
        <>
          {(['observe', 'orient', 'decide', 'act'] as const).map((field) => (
            <div key={field} className="form-row">
              <label className="label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <textarea
                className="textarea"
                value={ooda[field]}
                onChange={(e) => setOoda({ ...ooda, [field]: e.target.value })}
              />
            </div>
          ))}
        </>
      )}
      <button type="button" className="btn btn-primary" onClick={save}>
        Сохранить рефлексию
      </button>
      <div style={{ marginTop: 12 }}>
        {recent.map((r) => (
          <div key={r.id} className="kernel-line">
            {r.date} [{r.mode ?? 'pmr'}] {r.reflect.slice(0, 60)}
          </div>
        ))}
      </div>
    </div>
  );
}
