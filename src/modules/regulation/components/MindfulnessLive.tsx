import { useEffect, useRef, useState } from 'react';
import { todayKey } from '@/core/db';
import { afterMindfulnessComplete } from '@/core/engines/os-kernel';
import { MINDFULNESS_PRESETS } from '@/content/regulation-protocols';

interface Props {
  onComplete: () => void;
}

export function MindfulnessLive({ onComplete }: Props) {
  const [presetId, setPresetId] = useState(MINDFULNESS_PRESETS[0].id);
  const preset = MINDFULNESS_PRESETS.find((p) => p.id === presetId) ?? MINDFULNESS_PRESETS[0];
  const [running, setRunning] = useState(false);
  const [leftSec, setLeftSec] = useState(preset.durationMin * 60);
  const [phaseLabel, setPhaseLabel] = useState('Подготовка');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phases =
    preset.type === 'body_scan'
      ? ['Ноги', 'Таз', 'Корпус', 'Грудь', 'Голова', 'Целостность']
      : preset.type === 'focus'
        ? ['Якорь внимания', 'Отвлечение → возврат', 'Устойчивость']
        : ['Grounding', 'Дыхание', 'Наблюдение', 'Интеграция'];

  useEffect(() => {
    if (!running) return;
    const total = preset.durationMin * 60;
    const phaseDur = Math.floor(total / phases.length);
    timerRef.current = setInterval(() => {
      setLeftSec((s) => {
        if (s <= 1) {
          void finish();
          return 0;
        }
        const elapsed = total - (s - 1);
        const idx = Math.min(phases.length - 1, Math.floor(elapsed / phaseDur));
        setPhaseLabel(phases[idx]);
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, preset]);

  const start = () => {
    setLeftSec(preset.durationMin * 60);
    setPhaseLabel(phases[0]);
    setRunning(true);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  };

  const finish = async () => {
    stop();
    const doneMin = preset.durationMin - Math.floor(leftSec / 60);
    await afterMindfulnessComplete({
      date: todayKey(),
      durationMin: Math.max(1, doneMin || preset.durationMin),
      type: preset.type,
    });
    onComplete();
  };

  const mm = Math.floor(leftSec / 60);
  const ss = leftSec % 60;

  return (
    <div className="panel">
      <div className="panel-title">Mindfulness LIVE</div>
      <div className="form-row">
        <label className="label">Тип</label>
        <select
          className="input"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          disabled={running}
        >
          {MINDFULNESS_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.durationMin} мин)
            </option>
          ))}
        </select>
      </div>

      {running && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28 }}>
            {mm}:{String(ss).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>Фаза: {phaseLabel}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {!running ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            Начать таймер
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => void finish()}>
              Завершить
            </button>
            <button type="button" className="btn btn-sm" onClick={stop}>
              Пауза/отмена
            </button>
          </>
        )}
      </div>
    </div>
  );
}
