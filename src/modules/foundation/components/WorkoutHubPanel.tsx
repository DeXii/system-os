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
import {
  isFoundationCardioPlanTask,
  type TaskId,
} from '@/core/ai/director-tasks';
import { TerminalBlock } from '@/ui/components/TerminalBlock';
import { WorkoutPlanEditor } from './WorkoutPlanEditor';

interface Props {
  onPlanAccepted: (plan: WorkoutPlan) => void;
  onCardioReady: (session: CardioSession) => void;
  onRefresh?: () => void;
}

type HubPhase = 'idle' | 'gpp_pick' | 'cardio_pick' | 'preview';

interface LastRequest {
  kind: WorkoutKind;
  gppSubtype?: GppSubtype;
}

function responseLooksLikeJsonActions(text: string): boolean {
  return /```json/i.test(text) || /"set_workout_plan"/i.test(text);
}

function formatPlanFailureHint(
  taskId: TaskId,
  meta: { droppedCount: number; droppedReasons: string[]; rawActionCount: number },
  actionsLen: number,
  jsonHint: string
): string {
  const isCardio = isFoundationCardioPlanTask(taskId);
  const expected = isCardio ? 'set_cardio_session_plan' : 'set_workout_plan';
  const dropDetail =
    meta.droppedReasons.length > 0
      ? `Причина: ${meta.droppedReasons[0]}. `
      : meta.droppedCount > 0
        ? `Отброшено действий: ${meta.droppedCount} (см. KERNEL). `
        : meta.rawActionCount > 0 && actionsLen === 0
          ? `Все ${meta.rawActionCount} действий отфильтрованы. `
          : '';
  return `${dropDetail}${jsonHint}DIRECTOR не вернул ${expected} — используйте «Простой план без ИИ».`;
}

export function WorkoutHubPanel({ onPlanAccepted, onCardioReady, onRefresh }: Props) {
  const [phase, setPhase] = useState<HubPhase>('idle');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastDirectorText, setLastDirectorText] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [recommendedGpp, setRecommendedGpp] = useState<GppSubtype>('push');
  const [stats, setStats] = useState<Record<string, string>>({});
  const [levelsLine, setLevelsLine] = useState('');
  const [pendingCardio, setPendingCardio] = useState<'cardio_intense' | 'cardio_easy' | null>(null);
  const [lastRequest, setLastRequest] = useState<LastRequest | null>(null);

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
    setStatusMessage('Запрос к DIRECTOR...');
    setActionHint(null);
    setLastRequest({ kind, gppSubtype });
    const userMessage =
      userExtra ??
      (gppSubtype
        ? `Составь GPP тренировку типа ${gppSubtype} на сегодня на грани моих возможностей.`
        : `Составь план ${kind} на сегодня.`);

    try {
      const res = await runDirectorTask(taskId, {
        scope: 'foundation',
        userMessage,
        workoutContext: { kind, gppSubtype },
        onProgress: setStatusMessage,
      });

      if (!res.ok) {
        setLastDirectorText(res.error);
        setActionHint(null);
        setPhase('idle');
        return;
      }

      setLastDirectorText(res.insight.text);

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
        setActionHint(null);
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
        setPhase('preview');
        setActionHint(null);
        return;
      }

      const jsonHint = responseLooksLikeJsonActions(res.insight.text)
        ? 'План в тексте, но actions не прошли валидацию. '
        : '';
      setActionHint(formatPlanFailureHint(taskId, res.meta, res.insight.actions.length, jsonHint));
      setPhase('idle');
    } catch (e) {
      setLastDirectorText(e instanceof Error ? e.message : 'Ошибка DIRECTOR');
      setActionHint(null);
      setPhase('idle');
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const runLocal = async (kind: WorkoutKind, gppSubtype?: GppSubtype) => {
    setLoading(true);
    setActionHint(null);
    try {
      let p: WorkoutPlan;
      if (kind === 'hift') p = await buildHiftPlanLocal();
      else if (gppSubtype) p = await buildGppPlanLocal(gppSubtype);
      else if (kind === 'warmup') p = await buildWarmupPlanLocal();
      else if (kind === 'stretch') p = await buildStretchPlanLocal();
      else return;
      setPlan(p);
      setLastDirectorText('Локальный план (без ИИ)');
      setPhase('preview');
    } finally {
      setLoading(false);
    }
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

  const directorFeedback = (
    <>
      {loading && statusMessage && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>{statusMessage}</p>
      )}
      {!loading && lastDirectorText && (
        <div className="mb-sm" style={{ marginBottom: 8 }}>
          <TerminalBlock>{lastDirectorText}</TerminalBlock>
        </div>
      )}
      {!loading && actionHint && (
        <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 8 }}>{actionHint}</p>
      )}
      {!loading && actionHint && lastRequest && lastRequest.kind !== 'cardio_intense' && lastRequest.kind !== 'cardio_easy' && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginBottom: 8 }}
          onClick={() => void runLocal(lastRequest.kind, lastRequest.gppSubtype)}
        >
          Простой план без ИИ
        </button>
      )}
    </>
  );

  if (phase === 'preview' && plan) {
    return (
      <div className="panel">
        <div className="panel-title">Превью плана — {plan.kind}</div>
        {directorFeedback}
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

      {directorFeedback}

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
