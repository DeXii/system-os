import { useCallback, useEffect, useRef, useState } from 'react';
import { todayKey } from '@/core/db';
import { afterBreathingComplete } from '@/core/engines/os-kernel';
import { RESONANT_PRESETS } from '@/content/regulation-protocols';
import type { BreathingSession } from '@/core/domain/types';

interface Props {
  onComplete: () => void;
}

type Phase = 'idle' | 'inhale' | 'exhale';

export function ResonantBreathLive({ onComplete }: Props) {
  const [presetId, setPresetId] = useState(RESONANT_PRESETS[0].id);
  const preset = RESONANT_PRESETS.find((p) => p.id === presetId) ?? RESONANT_PRESETS[0];
  const [durationMin, setDurationMin] = useState(preset.defaultDurationMin);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const durationMinRef = useRef(durationMin);
  const presetRef = useRef(preset);
  const onCompleteRef = useRef(onComplete);

  const totalSec = durationMin * 60;

  useEffect(() => {
    durationMinRef.current = durationMin;
    presetRef.current = preset;
    onCompleteRef.current = onComplete;
  }, [durationMin, preset, onComplete]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setPhase('idle');
  }, []);

  const finish = useCallback(async () => {
    stop();
    const p = presetRef.current;
    const mins = Math.max(1, Math.round(elapsedRef.current / 60) || durationMinRef.current);
    const session: Omit<BreathingSession, 'id'> = {
      date: todayKey(),
      mode: 'resonant',
      durationMin: mins,
      breathsPerMin: p.breathsPerMin,
    };
    await afterBreathingComplete(session);
    onCompleteRef.current();
  }, [stop]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const next = elapsedRef.current;
      setElapsedSec(next);
      const inhale = presetRef.current.inhaleSec;
      const cycle = inhale + presetRef.current.exhaleSec;
      const pos = next % cycle;
      setPhase(pos < inhale ? 'inhale' : 'exhale');
      if (next >= durationMinRef.current * 60) {
        void finish();
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, finish]);

  const start = () => {
    elapsedRef.current = 0;
    setElapsedSec(0);
    setPhase('inhale');
    setRunning(true);
  };

  const progress = totalSec > 0 ? Math.min(100, (elapsedSec / totalSec) * 100) : 0;
  const circleScale = phase === 'inhale' ? 1.15 : phase === 'exhale' ? 0.85 : 1;

  return (
    <div className="panel">
      <div className="panel-title">Резонансное дыхание LIVE</div>
      <div className="form-row">
        <label className="label">Пресет</label>
        <select
          className="input"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          disabled={running}
        >
          {RESONANT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="label">Длительность (мин)</label>
        <input
          type="range"
          min={5}
          max={20}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          disabled={running}
        />
        <span style={{ fontSize: 12 }}>{durationMin} мин</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '1.5rem 0',
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            background: 'rgba(0, 200, 150, 0.08)',
            transform: `scale(${circleScale})`,
            transition: `transform ${preset.inhaleSec}s ease-in-out`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 14,
          }}
        >
          {running ? (phase === 'inhale' ? 'Вдох' : 'Выдох') : '—'}
        </div>
      </div>

      {running && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
          {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')} / {durationMin}:00
          · {Math.round(progress)}%
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {!running ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            Начать LIVE
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => void finish()}>
              Завершить
            </button>
            <button type="button" className="btn btn-sm" onClick={stop}>
              Отмена
            </button>
          </>
        )}
      </div>
    </div>
  );
}
