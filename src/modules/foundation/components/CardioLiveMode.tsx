import { useEffect, useState } from 'react';
import { afterCardioComplete } from '@/core/engines/os-kernel';
import type { CardioSession } from '@/core/domain/types';

interface Props {
  session: CardioSession;
  onExit: () => void;
  onComplete: () => void;
}

export function CardioLiveMode({ session, onExit, onComplete }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [distanceKm, setDistanceKm] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [maxHr, setMaxHr] = useState('');

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const finish = async () => {
    const durationMin = Math.max(1, Math.round(elapsed / 60));
    await afterCardioComplete(session.id, {
      durationMin,
      distanceKm: distanceKm ? Number(distanceKm) : undefined,
      avgHr: avgHr ? Number(avgHr) : undefined,
      maxHr: maxHr ? Number(maxHr) : undefined,
    });
    onComplete();
  };

  const label = session.kind === 'cardio_intense' ? 'Интенсивное кардио' : 'Спокойное кардио';

  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <div className="panel-title">LIVE — {label}</div>
      {session.notes && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{session.notes}</p>
      )}
      <p style={{ fontSize: 32, fontFamily: 'var(--mono)', textAlign: 'center', margin: '1rem 0' }}>
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
      </p>
      <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--text-dim)' }}>
        План: ~{session.durationMin} мин
      </p>
      {!running ? (
        <button type="button" className="btn btn-primary btn-block" onClick={() => setRunning(true)}>
          Старт
        </button>
      ) : (
        <button type="button" className="btn btn-block" onClick={() => setRunning(false)}>
          Пауза
        </button>
      )}
      <div className="form-row" style={{ marginTop: 12 }}>
        <label className="label">Дистанция (км)</label>
        <input className="input" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
      </div>
      <div className="form-row">
        <label className="label">Пульс средний</label>
        <input className="input" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} />
      </div>
      <div className="form-row">
        <label className="label">Пульс макс</label>
        <input className="input" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} />
      </div>
      <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={finish}>
        Завершить
      </button>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={onExit}>
        Прервать
      </button>
    </div>
  );
}
