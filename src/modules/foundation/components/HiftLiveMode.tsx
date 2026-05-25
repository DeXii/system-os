import { useEffect, useRef, useState } from 'react';
import { getCatalogExerciseById } from '@/content/exercises';
import { db, todayKey, uid } from '@/core/db';
import { afterWorkoutComplete } from '@/core/engines/os-kernel';
import type { SetLog, WorkoutPlan } from '@/core/domain/types';

interface Props {
  plan: WorkoutPlan;
  onExit: () => void;
  onComplete: () => void;
}

export function HiftLiveMode({ plan, onExit, onComplete }: Props) {
  const rounds = plan.rounds ?? 3;
  const roundRestSec = plan.roundRestSec ?? 120;
  const [roundIdx, setRoundIdx] = useState(0);
  const [exIdx, setExIdx] = useState(0);
  const [phase, setPhase] = useState<'work' | 'round_rest'>('work');
  const [restLeft, setRestLeft] = useState(0);
  const logsRef = useRef<SetLog[]>([]);
  const [repsInput, setRepsInput] = useState('');

  const exercise = plan.exercises[exIdx];

  useEffect(() => {
    if (phase !== 'round_rest') return;
    if (restLeft <= 0) {
      setPhase('work');
      setExIdx(0);
      setRoundIdx((r) => r + 1);
      return;
    }
    const t = setInterval(() => setRestLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, restLeft]);

  const finishWorkout = async () => {
    for (const log of logsRef.current) await db.setLogs.add(log);
    await afterWorkoutComplete({ ...plan, status: 'completed' });
    onComplete();
  };

  const completeExercise = () => {
    if (!exercise) return;
    const actual = Number(repsInput) || exercise.targetReps;
    const log: SetLog = {
      id: uid(),
      date: plan.date || todayKey(),
      workoutPlanId: plan.id,
      exerciseId: exercise.exerciseId,
      setIndex: 0,
      targetReps: exercise.targetReps,
      actualReps: actual,
      restSec: 0,
      roundIndex: roundIdx,
      workoutKind: 'hift',
      measure: exercise.measure ?? 'reps',
    };
    logsRef.current = [...logsRef.current, log];
    setRepsInput('');

    if (exIdx + 1 >= plan.exercises.length) {
      if (roundIdx + 1 >= rounds) {
        void finishWorkout();
      } else {
        setPhase('round_rest');
        setRestLeft(roundRestSec);
      }
    } else {
      setExIdx((i) => i + 1);
    }
  };

  if (!exercise) {
    return (
      <div className="panel">
        <p>План HIFT пуст.</p>
        <button type="button" className="btn" onClick={onExit}>
          Назад
        </button>
      </div>
    );
  }

  const meta = getCatalogExerciseById(exercise.exerciseId);

  if (phase === 'round_rest') {
    return (
      <div className="panel" style={{ maxWidth: 480 }}>
        <div className="panel-title">HIFT — отдых между кругами</div>
        <p style={{ fontSize: 28, fontFamily: 'var(--mono)', textAlign: 'center' }}>
          Круг {roundIdx + 1} завершён · отдых {restLeft}с
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
          Следующий круг {roundIdx + 2}/{rounds}
        </p>
        <button type="button" className="btn btn-block" onClick={() => setRestLeft((s) => s + 30)}>
          +30 сек
        </button>
        <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={onExit}>
          Прервать
        </button>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <div className="panel-title">
        HIFT · круг {roundIdx + 1}/{rounds}
      </div>
      <p style={{ fontSize: 22, fontFamily: 'var(--mono)', margin: '0.75rem 0' }}>
        {exIdx + 1}/{plan.exercises.length}: {meta?.name ?? exercise.exerciseId}
      </p>
      <p style={{ fontSize: 18 }}>Цель: {exercise.targetReps} повт. (без отдыха до следующего)</p>
      <div className="form-row">
        <label className="label">Факт (повт.)</label>
        <input
          className="input"
          value={repsInput}
          onChange={(e) => setRepsInput(e.target.value)}
          placeholder={String(exercise.targetReps)}
        />
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={completeExercise}>
        Готово → следующее
      </button>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={onExit}>
        Прервать
      </button>
    </div>
  );
}
