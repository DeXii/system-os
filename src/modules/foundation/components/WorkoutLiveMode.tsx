import { useEffect, useRef, useState } from 'react';
import { getExerciseById } from '@/content/exercises-bars';
import { db, uid } from '@/core/db';
import { afterWorkoutComplete } from '@/core/engines/os-kernel';
import type { SetLog, WorkoutPlan } from '@/core/domain/types';

interface Props {
  plan: WorkoutPlan;
  onExit: () => void;
  onComplete: () => void;
}

export function WorkoutLiveMode({ plan, onExit, onComplete }: Props) {
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [phase, setPhase] = useState<'work' | 'rest'>('work');
  const logsRef = useRef<SetLog[]>([]);
  const [repsInput, setRepsInput] = useState('');

  const exercise = plan.exercises[exIdx];
  const meta = exercise ? getExerciseById(exercise.exerciseId) : undefined;

  useEffect(() => {
    if (phase !== 'rest') return;
    if (restLeft <= 0) {
      advanceAfterRest();
      return;
    }
    const t = setInterval(() => {
      setRestLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, restLeft]);

  const advanceAfterRest = () => {
    setPhase('work');
    const ex = plan.exercises[exIdx];
    if (!ex) return;
    if (setIdx + 1 >= ex.sets) {
      if (exIdx + 1 >= plan.exercises.length) {
        void finishWorkout();
      } else {
        setExIdx((i) => i + 1);
        setSetIdx(0);
      }
    } else {
      setSetIdx((i) => i + 1);
    }
  };

  const finishWorkout = async () => {
    for (const log of logsRef.current) await db.setLogs.add(log);
    await afterWorkoutComplete({ ...plan, status: 'completed' });
    onComplete();
  };

  const completeSet = async () => {
    if (!exercise) return;
    const actual = Number(repsInput) || exercise.targetReps;
    const log: SetLog = {
      id: uid(),
      date: plan.date,
      workoutPlanId: plan.id,
      exerciseId: exercise.exerciseId,
      setIndex: setIdx,
      targetReps: exercise.targetReps,
      actualReps: actual,
      restSec: exercise.restSec,
    };
    logsRef.current = [...logsRef.current, log];
    setRepsInput('');
    setRestLeft(exercise.restSec);
    setPhase('rest');
  };

  if (!exercise || !meta) {
    return (
      <div className="panel">
        <p>План пуст.</p>
        <button type="button" className="btn" onClick={onExit}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <div className="panel-title">LIVE — {meta.name}</div>
      <p style={{ fontSize: 28, fontFamily: 'var(--mono)', margin: '1rem 0' }}>
        Подход {setIdx + 1} / {exercise.sets}
      </p>
      <p style={{ fontSize: 18 }}>Цель: {exercise.targetReps} повт.</p>

      {phase === 'work' ? (
        <>
          <div className="form-row">
            <label className="label">Факт (повт.)</label>
            <input
              className="input"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              placeholder={String(exercise.targetReps)}
            />
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={completeSet}>
            Сделал
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 24, textAlign: 'center', margin: '1rem 0' }}>
            Отдых: {restLeft} сек
          </p>
          <button
            type="button"
            className="btn btn-block"
            onClick={() => setRestLeft((s) => s + 30)}
          >
            +30 сек
          </button>
        </>
      )}

      <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
        Упражнение {exIdx + 1}/{plan.exercises.length}
      </p>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={onExit}>
        Прервать
      </button>
    </div>
  );
}
