import { getCatalogExerciseById } from '@/content/exercises';
import type { PlannedExercise, WorkoutPlan } from '@/core/domain/types';

interface Props {
  plan: WorkoutPlan;
  onChange: (plan: WorkoutPlan) => void;
  onAccept: () => void;
  onRegenerateAi?: () => void;
  onLocalFallback?: () => void;
  loading?: boolean;
}

export function WorkoutPlanEditor({
  plan,
  onChange,
  onAccept,
  onRegenerateAi,
  onLocalFallback,
  loading,
}: Props) {
  const updateExercise = (index: number, patch: Partial<PlannedExercise>) => {
    const exercises = plan.exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex));
    onChange({ ...plan, exercises });
  };

  return (
    <div>
      {plan.notes && <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 8 }}>{plan.notes}</p>}
      <ul className="mission-list">
        {plan.exercises.map((ex, i) => {
          const meta = getCatalogExerciseById(ex.exerciseId);
          const isSec = ex.measure === 'seconds' || meta?.measure === 'seconds';
          return (
            <li key={i} className="mission-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="mission-title">{meta?.name ?? ex.exerciseId}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <label style={{ fontSize: 11 }}>
                  Подходы
                  <input
                    className="input"
                    style={{ width: 48 }}
                    type="number"
                    min={1}
                    max={4}
                    value={ex.sets}
                    onChange={(e) => updateExercise(i, { sets: Number(e.target.value) })}
                  />
                </label>
                <label style={{ fontSize: 11 }}>
                  {isSec ? 'Сек' : 'Повт'}
                  <input
                    className="input"
                    style={{ width: 56 }}
                    type="number"
                    min={1}
                    value={isSec ? ex.targetSeconds ?? ex.targetReps : ex.targetReps}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateExercise(
                        i,
                        isSec
                          ? { targetSeconds: v, targetReps: v, measure: 'seconds' }
                          : { targetReps: v, measure: 'reps' }
                      );
                    }}
                  />
                </label>
                <label style={{ fontSize: 11 }}>
                  Отдых
                  <input
                    className="input"
                    style={{ width: 56 }}
                    type="number"
                    min={0}
                    value={ex.restSec}
                    onChange={(e) => updateExercise(i, { restSec: Number(e.target.value) })}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={onAccept}>
          Принять и LIVE
        </button>
        {onRegenerateAi && (
          <button type="button" className="btn btn-sm" disabled={loading} onClick={onRegenerateAi}>
            Запросить у DIRECTOR снова
          </button>
        )}
        {onLocalFallback && (
          <button type="button" className="btn btn-sm" disabled={loading} onClick={onLocalFallback}>
            Простой план без ИИ
          </button>
        )}
      </div>
    </div>
  );
}
