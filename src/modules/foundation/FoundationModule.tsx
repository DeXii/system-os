import { useCallback, useEffect, useState } from 'react';
import { getExerciseById } from '@/content/exercises-bars';
import { TASK_KEYS } from '@/content/task-keys';
import { db, dateKeyDaysAgo, todayKey, uid } from '@/core/db';
import { getCalibration } from '@/core/engines/workout-planner';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import {
  buildWorkoutPlan,
  ensureTodayWorkoutPlan,
  getTodayWorkoutPlan,
} from '@/core/engines/workout-planner';
import { emitKernel } from '@/core/events/event-bus';
import { getDegradedMessage } from '@/core/engines/stage-gates';
import type { ModuleStatus, SetLog, WorkoutPlan } from '@/core/domain/types';
import { BftPanel } from './components/BftPanel';
import { CalibrationPanel } from './components/CalibrationPanel';
import { FoundationDirectorPanel } from './components/FoundationDirectorPanel';
import { WorkoutLiveMode } from './components/WorkoutLiveMode';
import { StageBooksWidget } from '@/modules/library/components/StageBooksWidget';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
  onOpenLibrary?: () => void;
}

export function FoundationModule({ moduleStatus, onRefresh, onOpenLibrary }: Props) {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [live, setLive] = useState(false);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [queueHint, setQueueHint] = useState<string | null>(null);
  const [recovery, setRecovery] = useState({ sleep: '7', nutrition: true, hydration: true });
  const [generating, setGenerating] = useState(false);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [hasCalibration, setHasCalibration] = useState(true);

  const load = useCallback(async () => {
    const p = await getTodayWorkoutPlan();
    setPlan(p ?? null);
    const since7 = dateKeyDaysAgo(6);
    const logs = await db.setLogs.where('date').aboveOrEqual(since7).toArray();
    setSetLogs(logs.sort((a, b) => b.date.localeCompare(a.date)));
    const slot = await findSlotByTaskKey(TASK_KEYS.foundationWorkout);
    if (slot) setQueueHint(`#${slot.rank} в COMMAND: ${slot.title}`);
    const cal = await getCalibration();
    setHasCalibration(!!cal);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generatePlan = async () => {
    setGenerating(true);
    setPlanMessage(null);
    try {
      if (!hasCalibration) {
        setPlanMessage('Рекомендуется сначала пройти калибровку — план будет с базовыми значениями.');
      }
      const p = await buildWorkoutPlan();
      setPlan(p);
      setPlanMessage(`План обновлён: ${p.exercises.length} упражнений.${p.notes ? ` (${p.notes})` : ''}`);
      await emitKernel('foundation', 'План тренировки сгенерирован', 'info');
      onRefresh();
    } catch (e) {
      setPlanMessage(e instanceof Error ? e.message : 'Ошибка генерации плана');
    } finally {
      setGenerating(false);
    }
  };

  const startLive = async () => {
    const p = plan ?? (await ensureTodayWorkoutPlan());
    await db.workoutPlans.update(p.id, { status: 'in_progress' });
    setPlan(p);
    setLive(true);
  };

  const saveRecovery = async () => {
    const today = todayKey();
    const existing = await db.dailyLogs.where('date').equals(today).first();
    await db.dailyLogs.put({
      id: existing?.id ?? uid(),
      date: today,
      sleepHours: Number(recovery.sleep),
      nutritionOk: recovery.nutrition,
      hydrationOk: recovery.hydration,
    });
    await emitKernel('foundation', 'Recovery ops обновлены', 'info');
    onRefresh();
  };

  const degraded = moduleStatus === 'degraded' ? getDegradedMessage('foundation') : null;

  if (live && plan) {
    return (
      <WorkoutLiveMode
        plan={plan}
        onExit={() => setLive(false)}
        onComplete={() => {
          setLive(false);
          load();
          onRefresh();
        }}
      />
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--mono)', marginBottom: '1rem' }}>FOUNDATION — Этап 1</h1>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          Foundation: GPP и HIFT, BFT, today workout с set log, calibration оператора и recovery ops.
        </p>
      </GlossaryZone>
      {degraded && <div className="alert-banner">{degraded}</div>}
      {queueHint && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: '0.75rem' }}>
          Сегодня в очереди: {queueHint}
        </p>
      )}

      <StageBooksWidget level={1} onOpenLibrary={onOpenLibrary} />

      <CalibrationPanel
        onSaved={() => {
          setHasCalibration(true);
          onRefresh();
        }}
      />
      <BftPanel onSaved={onRefresh} />

      <div className="panel">
        <div className="panel-title">Today Workout</div>
        <GlossaryZone>
          {!hasCalibration ? (
            <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 8 }}>
              Operator calibration не задана — workout plan будет приблизительным.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
              Today workout — план на день; set log фиксирует подходы после LIVE.
            </p>
          )}
        </GlossaryZone>
        {planMessage && (
          <p
            style={{
              fontSize: 12,
              marginBottom: 8,
              color: planMessage.startsWith('Ошибка') ? 'var(--danger)' : 'var(--accent)',
            }}
          >
            {planMessage}
          </p>
        )}
        {!plan && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={generatePlan}
            disabled={generating}
          >
            {generating ? 'Генерация...' : 'Сгенерировать план'}
          </button>
        )}
        {plan && (
          <>
            {plan.notes && (
              <p style={{ fontSize: 12, color: 'var(--warn)' }}>{plan.notes}</p>
            )}
            <ul className="mission-list">
              {plan.exercises.map((ex, i) => {
                const meta = getExerciseById(ex.exerciseId);
                return (
                  <li key={i} className="mission-item">
                    <div>
                      <div className="mission-title">{meta?.name ?? ex.exerciseId}</div>
                      <span className="tag">
                        {ex.sets}×{ex.targetReps} · отдых {ex.restSec}с
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn-primary" onClick={startLive}>
              Начать LIVE
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginLeft: 8 }}
              onClick={generatePlan}
              disabled={generating}
            >
              {generating ? '...' : 'Пересчитать план'}
            </button>
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">Recovery Ops</div>
        <GlossaryZone>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
            Recovery ops — сон и базовое recovery между тренировками foundation.
          </p>
        </GlossaryZone>
        <div className="form-row">
          <label className="label">Сон (ч)</label>
          <input
            className="input"
            value={recovery.sleep}
            onChange={(e) => setRecovery({ ...recovery, sleep: e.target.value })}
          />
        </div>
        <div className="check-row">
          <input
            type="checkbox"
            checked={recovery.nutrition}
            onChange={(e) => setRecovery({ ...recovery, nutrition: e.target.checked })}
          />
          Питание OK
        </div>
        <div className="check-row">
          <input
            type="checkbox"
            checked={recovery.hydration}
            onChange={(e) => setRecovery({ ...recovery, hydration: e.target.checked })}
          />
          Гидратация OK
        </div>
        <button type="button" className="btn" onClick={saveRecovery}>
          Сохранить recovery
        </button>
      </div>

      <div className="panel">
        <div className="panel-title">История подходов (7 дней)</div>
        {setLogs.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Нет логов — начните LIVE.</p>
        )}
        {setLogs.slice(0, 20).map((l) => (
          <div key={l.id} className="kernel-line">
            {l.date} · {getExerciseById(l.exerciseId)?.name ?? l.exerciseId} · {l.actualReps}/
            {l.targetReps}
          </div>
        ))}
      </div>

      <FoundationDirectorPanel
        onApplied={() => {
          load();
          onRefresh();
        }}
      />
    </div>
  );
}
