import { useCallback, useEffect, useState } from 'react';
import type { GppSubtype, WorkoutPlan } from '@/core/domain/types';
import { todayKey } from '@/core/db';
import {
  buildManualWorkoutPreview,
  listRecentManualWorkouts,
  logManualWorkout,
  type ManualSetRow,
  type ManualWorkoutType,
} from '@/core/engines/manual-workout-log';

interface Props {
  onSaved: () => void;
}

const GPP_OPTIONS: { sub: GppSubtype; label: string }[] = [
  { sub: 'push', label: 'GPP Push' },
  { sub: 'pull', label: 'GPP Pull' },
  { sub: 'core', label: 'GPP Core' },
  { sub: 'legs', label: 'GPP Legs' },
];

export function ManualWorkoutLogPanel({ onSaved }: Props) {
  const [date, setDate] = useState(todayKey());
  const [workoutType, setWorkoutType] = useState<ManualWorkoutType>('hift');
  const [durationMin, setDurationMin] = useState('45');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ManualSetRow[]>([]);
  const [templateHint, setTemplateHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<WorkoutPlan[]>([]);

  const loadTemplate = useCallback((type: ManualWorkoutType) => {
    const preview = buildManualWorkoutPreview(type);
    setRows(preview.rows);
    setTemplateHint(preview.templateHint ?? null);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistory(await listRecentManualWorkouts(5));
  }, []);

  useEffect(() => {
    loadTemplate(workoutType);
  }, [workoutType, loadTemplate]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const updateRowActual = (key: string, actual: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, actual } : r)));
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await logManualWorkout({
        date,
        type: workoutType,
        durationMin: Number(durationMin) || 45,
        notes: notes.trim() || undefined,
        rows,
      });
      setNotes('');
      setDurationMin('45');
      loadTemplate(workoutType);
      await loadHistory();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const isHift = workoutType === 'hift';

  return (
    <div className="panel">
      <div className="panel-title">Записать выполненную</div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
        HIFT или GPP вне LIVE — с фактическими подходами для статистики и уровней.
      </p>

      <div className="grid-2">
        <div className="form-row">
          <label className="label">Дата</label>
          <input
            className="input"
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label className="label">Длительность (мин)</label>
          <input
            className="input"
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <label className="label">Тип</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm${workoutType === 'hift' ? ' btn-primary' : ''}`}
            onClick={() => setWorkoutType('hift')}
          >
            HIFT
          </button>
          {GPP_OPTIONS.map(({ sub, label }) => (
            <button
              key={sub}
              type="button"
              className={`btn btn-sm${workoutType === sub ? ' btn-primary' : ''}`}
              onClick={() => setWorkoutType(sub)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {templateHint && (
        <p style={{ fontSize: 11, color: 'var(--warn)', marginBottom: 8 }}>{templateHint}</p>
      )}

      <div className="form-row">
        <label className="label">Заметка</label>
        <input
          className="input"
          value={notes}
          placeholder="опционально"
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 12, maxHeight: 320, overflow: 'auto' }}>
          <p style={{ fontSize: 12, marginBottom: 6 }}>
            {isHift ? 'Круг × упражнение (3 круга)' : 'Упражнение × подход'}
          </p>
          {rows.map((row) => {
            const targetLabel =
              row.measure === 'seconds'
                ? `${row.targetSeconds ?? row.targetReps}с`
                : `${row.targetReps}`;
            const roundLabel =
              row.roundIndex != null ? ` · круг ${row.roundIndex + 1}` : '';
            const setLabel = !isHift ? ` · подход ${row.setIndex + 1}` : '';
            return (
              <div
                key={row.key}
                className="form-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 72px',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 12 }}>
                  {row.exerciseName}
                  {roundLabel}
                  {setLabel}
                  <span style={{ color: 'var(--text-dim)' }}> (цель {targetLabel})</span>
                </span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder={row.measure === 'seconds' ? 'сек' : 'реп'}
                  value={row.actual}
                  onChange={(e) => updateRowActual(row.key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
      )}

      <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
        {saving ? 'Сохранение…' : 'Сохранить тренировку'}
      </button>

      {history.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
            Недавние ручные записи
          </p>
          {history.map((p) => (
            <div key={p.id} className="kernel-line">
              <span className="tag" style={{ marginRight: 6, fontSize: 10 }}>
                manual
              </span>
              {p.date} · {p.kind}
              {p.notes && p.notes !== 'manual' ? ` · ${p.notes.replace(/^manual:\s*/, '')}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
