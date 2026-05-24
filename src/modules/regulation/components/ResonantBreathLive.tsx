import { useEffect, useRef, useState } from 'react';
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

  const totalSec = durationMin * 60;

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setElapsedSec((s) => {
        const next = s + 1;
        if (next >= totalSec) {
          void finish();
          return s;
        }
        const inhale = preset.inhaleSec;
        const cycle = inhale + preset.exhaleSec;
        const pos = next % cycle;
        setPhase(pos < inhale ? 'inhale' : 'exhale');
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, totalSec, preset]);

  const start = () => {
    setElapsedSec(0);
    setPhase('inhale');
    setRunning(true);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setPhase('idle');
  };

  const finish = async () => {
    stop();
    const session: Omit<BreathingSession, 'id'> = {
      date: todayKey(),
      mode: 'resonant',
      durationMin: Math.max(1, Math.round(elapsedSec / 60) || durationMin),
      breathsPerMin: preset.breathsPerMin,
    };
    await afterBreathingComplete(session);
    onComplete();
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
