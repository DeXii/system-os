import { useState } from 'react';
import {
  getDirectorConfig,
  getDirectorStatus,
  testDirectorConnection,
} from '@/core/ai/director-service';
import { getTasksByCategory, isDeepAnalysisTask, type TaskId } from '@/core/ai/director-tasks';
import { useDirectorRunner } from './hooks/useDirectorRunner';
import { ActionCards } from './components/ActionCards';
import { GlossaryZone } from '@/ui/glossary';

const CATEGORY_LABELS: Record<string, string> = {
  command: 'Command',
  system: 'System / Integration',
  coach: 'Coaches',
  utility: 'Utility',
};

interface Props {
  onOpenArchive?: () => void;
}

export function DirectorModule({ onOpenArchive }: Props) {
  const status = getDirectorStatus();
  const {
    loading,
    output,
    insight,
    history,
    run,
    applyActions,
    selectInsight,
  } = useDirectorRunner({ scope: 'full', loadHistory: true, historyLimit: 40 });
  const [testMsg, setTestMsg] = useState('');
  const categories = getTasksByCategory();
  const cfg = getDirectorConfig();

  const handleRun = async (taskId: TaskId) => {
    await run(taskId);
  };

  const testConnection = async () => {
    const r = await testDirectorConnection();
    setTestMsg(r.ok ? `OK: ${r.message}` : `Ошибка: ${r.message}`);
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--mono)', marginBottom: '1rem' }}>DIRECTOR</h1>
      <GlossaryZone>
        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem', fontSize: 13 }}>
          DIRECTOR на Groq: briefing и debrief, weekly audit, insight и action card по mission,
          protocol и readiness четырёх этапов.
        </p>
      </GlossaryZone>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-title">Groq / Статус</div>
        <p style={{ fontSize: 12, marginBottom: 8 }}>
          Статус: <span className={`director-status ${status}`}>{status.toUpperCase()}</span>
          {status !== 'online' && (
            <>
              {' '}
              ·{' '}
              {onOpenArchive ? (
                <button type="button" className="btn btn-sm" onClick={onOpenArchive}>
                  Настроить в ARCHIVE
                </button>
              ) : (
                'Настройте ключ и proxy в ARCHIVE'
              )}
            </>
          )}
        </p>
        {cfg.proxyUrl && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
            Proxy: {cfg.proxyUrl.slice(0, 48)}
            {cfg.proxyUrl.length > 48 ? '…' : ''}
          </p>
        )}
        <button type="button" className="btn btn-sm" disabled={loading} onClick={testConnection}>
          Проверить связь
        </button>
        {testMsg && (
          <p style={{ fontSize: 11, marginTop: 8, color: 'var(--text-dim)' }}>{testMsg}</p>
        )}
      </div>

      {(['command', 'system', 'coach', 'utility'] as const).map((cat) => {
        const tasks = categories[cat].filter((t) => t.core && !isDeepAnalysisTask(t.id as TaskId));
        if (!tasks.length) return null;
        return (
          <div key={cat} className="director-hub-section">
            <h3>{CATEGORY_LABELS[cat] ?? cat}</h3>
            <div className="director-hub-grid">
              {tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="btn btn-sm"
                  disabled={loading || status !== 'online'}
                  onClick={() => handleRun(t.id as TaskId)}
                  title={t.description}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="director-hub-section" style={{ marginTop: '1rem' }}>
        <h3>Глубокий анализ</h3>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Полный разбор за 14 или 30 дней (все записи в окне). Обычные кнопки выше — только последние 7
          дней.
        </p>
        <div className="director-hub-grid">
          {categories.system
            .filter((t) => t.core && isDeepAnalysisTask(t.id as TaskId))
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn-sm"
                disabled={loading || status !== 'online'}
                onClick={() => handleRun(t.id as TaskId)}
                title={t.description}
              >
                {t.label}
              </button>
            ))}
        </div>
      </div>

      {output && (
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <div className="panel-title">Ответ DIRECTOR</div>
          <div className="director-output">
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{output}</pre>
          </div>
          {insight && insight.actions.length > 0 && (
            <ActionCards actions={insight.actions} loading={loading} onApply={applyActions} />
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="panel">
          <div className="panel-title">История insights</div>
          {history.slice(0, 15).map((h) => (
            <button
              key={h.id}
              type="button"
              className="director-history-item"
              onClick={() => selectInsight(h)}
            >
              [{h.scope}] {h.taskId} · {h.createdAt.slice(0, 16)} — {h.text.slice(0, 100)}…
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
