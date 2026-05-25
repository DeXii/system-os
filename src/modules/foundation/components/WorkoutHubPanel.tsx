import { useCallback, useEffect, useState } from 'react';
import {
  fitnessTierLabel,
  gppKindFromSubtype,
  type CardioSession,
  type GppSubtype,
  type WorkoutKind,
  type WorkoutPlan,
} from '@/core/domain/types';
import { db, uid } from '@/core/db';
import {
  applyWorkoutPlanFromDirector,
  buildGppPlanLocal,
  buildHiftPlanLocal,
  buildStretchPlanLocal,
  buildWarmupPlanLocal,
  saveWorkoutPlan,
} from '@/core/engines/workout-planner';
import { getFitnessLevels } from '@/core/engines/progression-engine';
import {
  formatStatBadge,
  getRecommendedGppSubtype,
  getWorkoutTypeStat,
} from '@/core/engines/workout-stats';
import { runDirectorTask } from '@/core/ai/director-service';
import type { TaskId } from '@/core/ai/director-tasks';
import { WorkoutPlanEditor } from './WorkoutPlanEditor';

interface Props {
  onPlanAccepted: (plan: WorkoutPlan) => void;
  onCardioReady: (session: CardioSession) => void;
  onRefresh?: () => void;
}

type HubPhase = 'idle' | 'gpp_pick' | 'cardio_pick' | 'preview' | 'loading';

export function WorkoutHubPanel({ onPlanAccepted, onCardioReady, onRefresh }: Props) {
  const [phase, setPhase] = useState<HubPhase>('idle');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [recommendedGpp, setRecommendedGpp] = useState<GppSubtype>('push');
  const [stats, setStats] = useState<Record<string, string>>({});
  const [levelsLine, setLevelsLine] = useState('');
  const [pendingCardio, setPendingCardio] = useState<'cardio_intense' | 'cardio_easy' | null>(null);

  const loadMeta = useCallback(async () => {
    const rec = await getRecommendedGppSubtype();
    setRecommendedGpp(rec);
    const kinds: WorkoutKind[] = [
      'hift',
      'gpp_push',
      'gpp_pull',
      'gpp_core',
      'gpp_legs',
      'warmup',
      'stretch',
      'cardio_intense',
      'cardio_easy',
    ];
    const s: Record<string, string> = {};
    for (const k of kinds) {
      s[k] = formatStatBadge(await getWorkoutTypeStat(k));
    }
    setStats(s);
    const levels = await getFitnessLevels();
    setLevelsLine(
      `HIFT ${fitnessTierLabel(levels.hift)} · GPP ${fitnessTierLabel(levels.gpp)} · Зарядка ${fitnessTierLabel(levels.warmup)} · Растяжка ${fitnessTierLabel(levels.stretch)}`
    );
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const requestAiPlan = async (
    taskId: TaskId,
    kind: WorkoutKind,
    gppSubtype?: GppSubtype,
    userExtra?: string
  ) => {
    setLoading(true);
    setMessage(null);
    const userMessage =
      userExtra ??
      (gppSubtype
        ? `Составь GPP тренировку типа ${gppSubtype} на сегодня на грани моих возможностей.`
        : `Составь план ${kind} на сегодня.`);

    const res = await runDirectorTask(taskId, {
      scope: 'foundation',
      userMessage,
      workoutContext: { kind, gppSubtype },
      onProgress: setMessage,
    });

    if (!res.ok) {
      setMessage(res.error);
      setLoading(false);
      setPhase('idle');
      return;
    }

    const workoutAction = res.insight.actions.find((a) => a.type === 'set_workout_plan');
    const cardioAction = res.insight.actions.find((a) => a.type === 'set_cardio_session_plan');

    if (cardioAction && pendingCardio) {
      const durationMin = Math.max(10, Number(cardioAction.payload.durationMin) || 25);
      const session: CardioSession = {
        id: uid(),
        date: new Date().toISOString().slice(0, 10),
        kind: pendingCardio,
        durationMin,
        notes: String(cardioAction.payload.suggestedActivity ?? res.insight.text.slice(0, 120)),
      };
      await db.cardioSessions.put(session);
      setMessage(res.insight.text);
      setLoading(false);
      setPhase('idle');
      onCardioReady(session);
      onRefresh?.();
      return;
    }

    if (workoutAction && Array.isArray(workoutAction.payload.exercises)) {
      const built = await applyWorkoutPlanFromDirector(
        workoutAction.payload.exercises as unknown[],
        undefined,
        {
          kind: (workoutAction.payload.kind as WorkoutKind) ?? kind,
          structure: workoutAction.payload.structure as WorkoutPlan['structure'],
          rounds: Number(workoutAction.payload.rounds) || undefined,
          roundRestSec: Number(workoutAction.payload.roundRestSec) || undefined,
          circuitExerciseIds: workoutAction.payload.circuitExerciseIds as string[] | undefined,
          gppSubtype: (workoutAction.payload.gppSubtype as GppSubtype) ?? gppSubtype,
          notes: 'План DIRECTOR (превью)',
        }
      );
      setPlan(built);
      setLoading(false);
      setPhase('preview');
      setMessage(res.insight.text.slice(0, 400));
      return;
    }

    setMessage('DIRECTOR не вернул set_workout_plan — используйте «Простой план без ИИ».');
    setLoading(false);
    setPhase('idle');
  };

  const runLocal = async (kind: WorkoutKind, gppSubtype?: GppSubtype) => {
    setLoading(true);
    let p: WorkoutPlan;
    if (kind === 'hift') p = await buildHiftPlanLocal();
    else if (gppSubtype) p = await buildGppPlanLocal(gppSubtype);
    else if (kind === 'warmup') p = await buildWarmupPlanLocal();
    else if (kind === 'stretch') p = await buildStretchPlanLocal();
    else return;
    setPlan(p);
    setMessage('Локальный план (без ИИ)');
    setLoading(false);
    setPhase('preview');
  };

  const acceptPlan = async () => {
    if (!plan) return;
    await saveWorkoutPlan({ ...plan, status: 'planned' });
    await db.workoutPlans.update(plan.id, { status: 'in_progress' });
    onPlanAccepted({ ...plan, status: 'in_progress' });
    setPlan(null);
    setPhase('idle');
    void loadMeta();
    onRefresh?.();
  };

  const statBtn = (label: string, statKey: WorkoutKind, onClick: () => void, recommended?: boolean) => (
    <button
      key={statKey}
      type="button"
      className={`btn btn-sm${recommended ? ' btn-recommended' : ''}`}
      style={recommended ? { borderColor: 'var(--warn)', color: 'var(--warn)' } : undefined}
      onClick={onClick}
      disabled={loading}
    >
      {label}
      <span style={{ display: 'block', fontSize: 10, opacity: 0.85 }}>{stats[statKey] ?? '0 · —'}</span>
    </button>
  );

  if (phase === 'preview' && plan) {
    return (
      <div className="panel">
        <div className="panel-title">Превью плана — {plan.kind}</div>
        {message && (
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
            {message}
          </pre>
        )}
        <WorkoutPlanEditor
          plan={plan}
          onChange={setPlan}
          onAccept={acceptPlan}
          onRegenerateAi={() => {
            if (plan.kind === 'hift') void requestAiPlan('planHift', 'hift');
            else if (plan.gppSubtype) void requestAiPlan('planGpp', plan.kind!, plan.gppSubtype);
            else if (plan.kind === 'warmup') void requestAiPlan('planWarmup', 'warmup');
            else if (plan.kind === 'stretch') void requestAiPlan('planStretch', 'stretch');
          }}
          onLocalFallback={() => {
            if (plan.kind === 'hift') void runLocal('hift');
            else if (plan.gppSubtype) void runLocal(plan.kind!, plan.gppSubtype);
            else if (plan.kind === 'warmup') void runLocal('warmup');
            else if (plan.kind === 'stretch') void runLocal('stretch');
          }}
          loading={loading}
        />
        <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setPhase('idle')}>
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Тренировки</div>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>{levelsLine}</p>

      {loading && phase !== 'preview' && (
        <p style={{ fontSize: 12, color: 'var(--accent)' }}>{message ?? 'Запрос к DIRECTOR...'}</p>
      )}

      {phase === 'gpp_pick' && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, marginBottom: 8 }}>Выберите тип GPP (вечер):</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['push', 'pull', 'core', 'legs'] as GppSubtype[]).map((sub) =>
              statBtn(
                sub === 'push' ? 'Push' : sub === 'pull' ? 'Pull' : sub === 'core' ? 'Кор' : 'Ноги',
                gppKindFromSubtype(sub),
                () => {
                  void requestAiPlan('planGpp', gppKindFromSubtype(sub), sub);
                },
                sub === recommendedGpp
              )
            )}
          </div>
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setPhase('idle')}>
            Назад
          </button>
        </div>
      )}

      {phase === 'cardio_pick' && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, marginBottom: 8 }}>Тип кардио:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statBtn('Интенсивное', 'cardio_intense', () => {
              setPendingCardio('cardio_intense');
              void requestAiPlan('planCardioIntense', 'cardio_intense');
            })}
            {statBtn('Спокойное', 'cardio_easy', () => {
              setPendingCardio('cardio_easy');
              void requestAiPlan('planCardioEasy', 'cardio_easy');
            })}
          </div>
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setPhase('idle')}>
            Назад
          </button>
        </div>
      )}

      {phase === 'idle' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statBtn('HIFT (утро)', 'hift', () => void requestAiPlan('planHift', 'hift'))}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setPhase('gpp_pick')}
            disabled={loading}
          >
            GPP (вечер)
            <span style={{ display: 'block', fontSize: 10 }}>
              рек.: {recommendedGpp} · {stats[`gpp_${recommendedGpp}`] ?? ''}
            </span>
          </button>
          {statBtn('Зарядка', 'warmup', () => void requestAiPlan('planWarmup', 'warmup'))}
          {statBtn('Растяжка', 'stretch', () => void requestAiPlan('planStretch', 'stretch'))}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setPhase('cardio_pick')}
            disabled={loading}
          >
            Кардио
          </button>
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
        Счётчик: всего выполнено · дата последней (ММ-ДД). Жёлтая кнопка GPP — рекомендация по ротации.
      </p>
    </div>
  );
}
