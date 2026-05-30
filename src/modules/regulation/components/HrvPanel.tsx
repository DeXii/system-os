import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterHrvComplete } from '@/core/engines/os-kernel';
import { RegulationValidationError } from '@/core/kernel/automations/after-regulation';
import {
  getHrvBaseline14d,
  getHrvTrend,
  isHrvBelowBaseline,
} from '@/core/engines/regulation-metrics';
import type { HrvEntry, HrvSource } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

const SOURCES: { value: HrvSource; label: string }[] = [
  { value: 'manual', label: 'Ручной' },
  { value: 'oura', label: 'Oura' },
  { value: 'whoop', label: 'Whoop' },
  { value: 'garmin', label: 'Garmin' },
  { value: 'other', label: 'Другое' },
];

export function HrvPanel({ onSaved }: Props) {
  const [history, setHistory] = useState<HrvEntry[]>([]);
  const [trend, setTrend] = useState<{ date: string; rmssd: number }[]>([]);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [form, setForm] = useState({
    rmssd: '',
    restingHr: '',
    source: 'manual' as HrvSource,
    subjectiveReadiness: '7',
    notes: '',
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    setHistory(await db.hrvEntries.orderBy('date').reverse().limit(14).toArray());
    setTrend(await getHrvTrend(14));
    setBaseline(await getHrvBaseline14d());
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaveError(null);
    const entry = {
      date: todayKey(),
      rmssd: form.rmssd ? Number(form.rmssd) : undefined,
      restingHr: form.restingHr ? Number(form.restingHr) : undefined,
      source: form.source,
      subjectiveReadiness: Number(form.subjectiveReadiness),
      notes: form.notes || undefined,
    };
    try {
      if (entry.rmssd != null && (await isHrvBelowBaseline(entry as HrvEntry))) {
        setAlert('RMSSD ниже baseline (z-score) — recovery, избегайте Wim Hof сегодня');
      } else {
        setAlert(null);
      }
      await afterHrvComplete(entry);
      setForm({
        rmssd: '',
        restingHr: '',
        source: 'manual',
        subjectiveReadiness: '7',
        notes: '',
      });
      load();
      onSaved();
    } catch (e) {
      if (e instanceof RegulationValidationError) {
        setSaveError(e.errors.join('; '));
      } else {
        setSaveError('Не удалось сохранить HRV');
      }
    }
  };

  const maxRmssd = Math.max(...trend.map((t) => t.rmssd), 1);

  return (
    <div className="panel">
      <div className="panel-title">HRV Monitor</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          HRV (RMSSD) показывает, насколько тело восстановилось. Baseline 14d — ваша норма для
          сравнения; ниже baseline — зона recovery.
        </p>
      </GlossaryZone>
      {baseline != null && (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Baseline 14d: {baseline} ms RMSSD
        </p>
      )}
      {alert && <div className="alert-banner">{alert}</div>}
      {saveError && (
        <div className="alert-banner" style={{ borderColor: 'var(--danger)' }}>
          {saveError}
        </div>
      )}

      <div className="form-row">
        <label className="label">RMSSD</label>
        <input
          className="input"
          value={form.rmssd}
          onChange={(e) => setForm({ ...form, rmssd: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Resting HR</label>
        <input
          className="input"
          value={form.restingHr}
          onChange={(e) => setForm({ ...form, restingHr: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Источник</label>
        <select
          className="input"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value as HrvSource })}
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="label">Субъективная готовность (1–10)</label>
        <input
          type="range"
          min={1}
          max={10}
          value={form.subjectiveReadiness}
          onChange={(e) => setForm({ ...form, subjectiveReadiness: e.target.value })}
        />
        <span style={{ fontSize: 12 }}>{form.subjectiveReadiness}</span>
      </div>
      <button type="button" className="btn btn-primary" onClick={save}>
        Записать HRV
      </button>

      {trend.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="panel-title" style={{ fontSize: 11 }}>
            Тренд 14 дней
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
            {trend.map((t) => (
              <div
                key={t.date}
                title={`${t.date}: ${t.rmssd}`}
                style={{
                  flex: 1,
                  height: `${(t.rmssd / maxRmssd) * 100}%`,
                  minHeight: 4,
                  background: 'var(--accent)',
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {history.map((h) => (
          <div key={h.id} className="kernel-line">
            {h.date} RMSSD={h.rmssd ?? '—'} HR={h.restingHr ?? '—'}{' '}
            {h.source ? `· ${h.source}` : ''}{' '}
            {h.subjectiveReadiness != null ? `· готовность ${h.subjectiveReadiness}/10` : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
