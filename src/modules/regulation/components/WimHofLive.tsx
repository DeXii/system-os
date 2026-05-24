import { useEffect, useRef, useState } from 'react';
import { todayKey } from '@/core/db';
import { afterBreathingComplete } from '@/core/engines/os-kernel';
import { WIMHOF_DISCLAIMER, WIMHOF_PRESETS } from '@/content/regulation-protocols';
import type { BreathingSession } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onComplete: () => void;
}

type WhPhase = 'disclaimer' | 'power' | 'retention' | 'recovery' | 'done';

export function WimHofLive({ onComplete }: Props) {
  const [presetId, setPresetId] = useState(WIMHOF_PRESETS[0].id);
  const preset = WIMHOF_PRESETS.find((p) => p.id === presetId) ?? WIMHOF_PRESETS[0];
  const [confirmed, setConfirmed] = useState(false);
  const [phase, setPhase] = useState<WhPhase>('disclaimer');
  const [round, setRound] = useState(1);
  const [breathCount, setBreathCount] = useState(0);
  const [retentionSec, setRetentionSec] = useState(0);
  const [retentions, setRetentions] = useState<number[]>([]);
  const [recoveryLeft, setRecoveryLeft] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const clearTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const startSession = () => {
    if (!confirmed) return;
    setRound(1);
    setBreathCount(0);
    setRetentions([]);
    setPhase('power');
  };

  const powerBreath = () => {
    const next = breathCount + 1;
    if (next >= preset.powerBreaths) {
      setBreathCount(0);
      setRetentionSec(0);
      setPhase('retention');
      tickRef.current = setInterval(() => {
        setRetentionSec((s) => s + 1);
      }, 1000);
      return;
    }
    setBreathCount(next);
  };

  const endRetention = () => {
    clearTick();
    setRetentions((r) => [...r, retentionSec]);
    setRecoveryLeft(preset.recoverySec);
    setPhase('recovery');
    tickRef.current = setInterval(() => {
      setRecoveryLeft((s) => {
        if (s <= 1) {
          clearTick();
          if (round >= preset.rounds) {
            void finishSession();
            return 0;
          }
          setRound((rnd) => rnd + 1);
          setPhase('power');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const finishSession = async () => {
    clearTick();
    setPhase('done');
    const avg =
      retentions.length > 0
        ? Math.round(retentions.reduce((a, b) => a + b, 0) / retentions.length)
        : retentionSec;
    const session: Omit<BreathingSession, 'id'> = {
      date: todayKey(),
      mode: 'wim_hof',
      durationMin: Math.max(5, Math.round((preset.rounds * (preset.powerBreaths * 2 + 60)) / 60)),
      rounds: preset.rounds,
      avgRetentionSec: avg,
    };
    await afterBreathingComplete(session);
    onComplete();
  };

  const reset = () => {
    clearTick();
    setPhase('disclaimer');
    setConfirmed(false);
    setRound(1);
    setBreathCount(0);
    setRetentionSec(0);
    setRetentions([]);
  };

  return (
    <div className="panel">
      <div className="panel-title">Wim Hof LIVE</div>

      {phase === 'disclaimer' && (
        <>
          <GlossaryZone>
            <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 12 }}>
              Wim Hof — интенсивное дыхание; не при низком HRV и baseline. {WIMHOF_DISCLAIMER}
            </p>
          </GlossaryZone>
          <label style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Понимаю риски и готов(а) продолжить
          </label>
          <div className="form-row">
            <label className="label">Пресет</label>
            <select
              className="input"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              {WIMHOF_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!confirmed}
            onClick={startSession}
          >
            Начать раунды
          </button>
        </>
      )}

      {phase === 'power' && (
        <>
          <p style={{ fontFamily: 'var(--mono)' }}>
            Раунд {round}/{preset.rounds} · Силовые вдохи: {breathCount}/{preset.powerBreaths}
          </p>
          <button type="button" className="btn btn-primary" onClick={powerBreath}>
            +1 вдох (тап)
          </button>
        </>
      )}

      {phase === 'retention' && (
        <>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 24 }}>
            Задержка: {retentionSec} с
          </p>
          <button type="button" className="btn btn-primary" onClick={endRetention}>
            Завершить задержку
          </button>
        </>
      )}

      {phase === 'recovery' && (
        <p style={{ fontFamily: 'var(--mono)' }}>Восстановление: {recoveryLeft} с</p>
      )}

      {phase === 'done' && (
        <p style={{ color: 'var(--accent)' }}>Сессия сохранена в OS.</p>
      )}

      {phase !== 'disclaimer' && phase !== 'done' && (
        <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={reset}>
          Сброс
        </button>
      )}
    </div>
  );
}
