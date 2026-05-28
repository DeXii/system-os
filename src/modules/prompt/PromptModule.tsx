import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDirectorPromptBundle } from '@/core/ai/director-service';
import { buildDisplayPromptParts } from '@/core/ai/prompt-display/build-display-prompt';
import {
  DIRECTOR_TASKS,
  resolveLookbackDays,
  type TaskId,
} from '@/core/ai/director-tasks';
import { getRecommendedGppSubtype } from '@/core/engines/workout-stats';
import {
  gppKindFromSubtype,
  type GppSubtype,
  type ModuleId,
} from '@/core/domain/types';
import { useDirectorPrompt } from '@/hooks/useDirectorPrompt';
import { setLastDirectorPrompt } from '@/stores/director-prompt-store';
import { ModuleShell } from '@/ui/shell/ModuleShell';
import { TerminalBlock } from '@/ui/components/TerminalBlock';

const SOURCE_LABELS = {
  run: 'запуск DIRECTOR',
  preview: 'сборка без API',
} as const;

const GPP_SUBTYPES: GppSubtype[] = ['push', 'pull', 'core', 'legs'];

function gppLabel(sub: GppSubtype): string {
  if (sub === 'push') return 'Push';
  if (sub === 'pull') return 'Pull';
  if (sub === 'core') return 'Кор';
  return 'Ноги';
}

function resolveBuildScope(taskId: TaskId): ModuleId | 'full' {
  if (taskId === 'planGpp' || taskId === 'planHift' || taskId === 'planWorkout') {
    return 'foundation';
  }
  return 'full';
}

export function PromptModule() {
  const prompt = useDirectorPrompt();
  const [taskId, setTaskId] = useState<TaskId>('morningBriefing');
  const [gppSubtype, setGppSubtype] = useState<GppSubtype>('push');
  const [recommendedGpp, setRecommendedGpp] = useState<GppSubtype>('push');
  const [operatorMessage, setOperatorMessage] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const isGppTask = taskId === 'planGpp';

  useEffect(() => {
    void getRecommendedGppSubtype().then(setRecommendedGpp);
  }, []);

  const displayParts = useMemo(
    () => (prompt ? buildDisplayPromptParts(prompt) : null),
    [prompt]
  );

  const copyText = useCallback(async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(`Скопировано: ${label}`);
    } catch {
      setCopyMsg('Не удалось скопировать');
    }
  }, []);

  const handleBuild = async () => {
    setBuilding(true);
    setBuildError('');
    setCopyMsg('');
    try {
      const scope = resolveBuildScope(taskId);
      const workoutContext = isGppTask
        ? { kind: gppKindFromSubtype(gppSubtype), gppSubtype }
        : undefined;
      const defaultMessage = isGppTask
        ? `Составь GPP тренировку типа ${gppSubtype} на сегодня.`
        : undefined;

      const bundle = await buildDirectorPromptBundle(taskId, {
        scope,
        userMessage: operatorMessage.trim() || defaultMessage,
        workoutContext,
      });
      const lookbackDays = resolveLookbackDays(taskId);
      setLastDirectorPrompt({
        taskId,
        scope,
        lookbackDays,
        system: bundle.system,
        user: bundle.user,
        contextJson: bundle.contextJson,
        contextJsonLength: bundle.contextJson.length,
        workoutContext,
        createdAt: new Date().toISOString(),
        source: 'preview',
      });
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : 'Ошибка сборки промпта');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div>
      <ModuleShell title="PROMPT" subtitle="COPY · MANUAL AGENT" />

      <div className="panel">
        <div className="panel-title">Собрать промпт</div>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Не публикуйте промпт в открытых чатах — внутри полный контекст оператора.
        </p>
        <div className="form-row">
          <label className="label">Задача DIRECTOR</label>
          <select
            className="input"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value as TaskId)}
          >
            {DIRECTOR_TASKS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.id})
              </option>
            ))}
          </select>
        </div>

        {isGppTask && (
          <div className="form-row">
            <label className="label">Тип GPP</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GPP_SUBTYPES.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  className={`btn btn-sm ${gppSubtype === sub ? 'btn-primary' : ''}`}
                  onClick={() => setGppSubtype(sub)}
                >
                  {gppLabel(sub)}
                  {sub === recommendedGpp ? ' · рек.' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-row">
          <label className="label">Запрос оператора (опционально)</label>
          <textarea
            className="input"
            rows={3}
            value={operatorMessage}
            onChange={(e) => setOperatorMessage(e.target.value)}
            placeholder={
              isGppTask
                ? `По умолчанию: GPP ${gppSubtype} на сегодня`
                : 'Дополнительный текст для user-сообщения'
            }
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={building}
          onClick={() => void handleBuild()}
        >
          {building ? 'Сборка…' : 'Собрать промпт'}
        </button>
        {buildError && (
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--danger, #c44)' }}>{buildError}</p>
        )}
      </div>

      {prompt && displayParts ? (
        <>
          <div className="panel">
            <div className="text-xs text-dim" style={{ lineHeight: 1.6, marginBottom: 12 }}>
              <span>
                {prompt.taskId} · {prompt.lookbackDays} дн. · scope {prompt.scope}
                {prompt.workoutContext?.gppSubtype
                  ? ` · GPP ${prompt.workoutContext.gppSubtype}`
                  : ''}{' '}
                · {SOURCE_LABELS[prompt.source]} · {new Date(prompt.createdAt).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void copyText(displayParts.full, 'всё')}
              >
                Скопировать всё
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void copyText(displayParts.systemCore, 'SYSTEM CORE')}
              >
                Скопировать CORE
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void copyText(displayParts.task, 'TASK')}
              >
                Скопировать TASK
              </button>
              {copyMsg && (
                <span style={{ fontSize: 12, color: 'var(--text-dim)', alignSelf: 'center' }}>
                  {copyMsg}
                </span>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">SYSTEM CORE</div>
            <TerminalBlock maxHeight={320}>{displayParts.systemCore}</TerminalBlock>
          </div>

          <div className="panel">
            <div className="panel-title">TASK</div>
            <TerminalBlock maxHeight={320}>{displayParts.task}</TerminalBlock>
          </div>
        </>
      ) : (
        <div className="panel">
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Промпт ещё не собран. Запустите задачу в DIRECTOR или нажмите «Собрать промпт» выше.
          </p>
        </div>
      )}
    </div>
  );
}
