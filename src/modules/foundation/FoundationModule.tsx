import { useCallback, useEffect, useState } from 'react';
import { getCatalogExerciseById } from '@/content/exercises';
import { getExerciseById } from '@/content/exercises-bars';
import { TASK_KEYS } from '@/content/task-keys';
import { db, dateKeyDaysAgo, todayKey, uid } from '@/core/db';
import { getCalibration } from '@/core/engines/workout-planner';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { emitKernel } from '@/core/events/event-bus';
import { getDegradedMessage } from '@/core/engines/stage-gates';
import type { CardioSession, ModuleStatus, SetLog, WorkoutPlan } from '@/core/domain/types';
import { BftPanel } from './components/BftPanel';
import { CalibrationPanel } from './components/CalibrationPanel';
import { CardioLiveMode } from './components/CardioLiveMode';
import { FitnessLevelPanel } from './components/FitnessLevelPanel';
import { HiftLiveMode } from './components/HiftLiveMode';
import { StraightSetsLiveMode } from './components/StraightSetsLiveMode';
import { FoundationDirectorPanel } from './components/FoundationDirectorPanel';
import { WorkoutHubPanel } from './components/WorkoutHubPanel';
import { StageBooksWidget } from '@/modules/library/components/StageBooksWidget';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
  onOpenLibrary?: () => void;
}

export function FoundationModule({ moduleStatus, onRefresh, onOpenLibrary }: Props) {
  const [livePlan, setLivePlan] = useState<WorkoutPlan | null>(null);
  const [cardioSession, setCardioSession] = useState<CardioSession | null>(null);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [queueHint, setQueueHint] = useState<string | null>(null);
  const [recovery, setRecovery] = useState({ sleep: '7', nutrition: true, hydration: true });
  const [hasCalibration, setHasCalibration] = useState(true);

  const load = useCallback(async () => {
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

  if (cardioSession) {
    return (
      <CardioLiveMode
        session={cardioSession}
        onExit={() => setCardioSession(null)}
        onComplete={() => {
          setCardioSession(null);
          load();
          onRefresh();
        }}
      />
    );
  }

  if (livePlan) {
    const Live =
      livePlan.structure === 'circuit' || livePlan.kind === 'hift' ? HiftLiveMode : StraightSetsLiveMode;
    return (
      <Live
        plan={livePlan}
        onExit={() => setLivePlan(null)}
        onComplete={() => {
          setLivePlan(null);
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
          Foundation: HIFT утром, GPP вечером, зарядка, растяжка, кардио. Уровни и прогрессия по логам 7 дней.
        </p>
      </GlossaryZone>
      {degraded && <div className="alert-banner">{degraded}</div>}
      {queueHint && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: '0.75rem' }}>
          Сегодня в очереди: {queueHint}
        </p>
      )}

      <StageBooksWidget level={1} onOpenLibrary={onOpenLibrary} />

      <FitnessLevelPanel />

      <CalibrationPanel
        onSaved={() => {
          setHasCalibration(true);
          onRefresh();
        }}
      />
      <BftPanel onSaved={onRefresh} />

      <WorkoutHubPanel
        onPlanAccepted={(p) => setLivePlan(p)}
        onCardioReady={(s) => setCardioSession(s)}
        onRefresh={() => {
          load();
          onRefresh();
        }}
      />

      {!hasCalibration && (
        <p style={{ fontSize: 12, color: 'var(--warn)', margin: '0 0 0.75rem' }}>
          Рекомендуется калибровка — планы DIRECTOR точнее с вашими максимумами.
        </p>
      )}

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

      <FoundationDirectorPanel
        onApplied={() => {
          load();
          onRefresh();
        }}
      />

      <div className="panel">
        <div className="panel-title">История подходов (7 дней)</div>
        {setLogs.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Нет логов — начните LIVE.</p>
        )}
        {setLogs.slice(0, 24).map((l) => {
          const meta =
            getCatalogExerciseById(l.exerciseId) ?? getExerciseById(l.exerciseId);
          const kind = l.workoutKind ? ` · ${l.workoutKind}` : '';
          const result =
            l.measure === 'seconds'
              ? `${l.actualSeconds ?? l.actualReps}/${l.targetSeconds ?? l.targetReps}с`
              : `${l.actualReps}/${l.targetReps}`;
          return (
            <div key={l.id} className="kernel-line">
              {l.date}
              {kind} · {meta?.name ?? l.exerciseId} · {result}
            </div>
          );
        })}
      </div>
    </div>
  );
}
