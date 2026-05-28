import { useState } from 'react';
import {
  getDirectorConfig,
  getDirectorStatus,
  testDirectorConnection,
} from '@/core/ai/director-service';
import { getTasksByCategory, isDeepAnalysisTask, type TaskId } from '@/core/ai/director-tasks';
import { useDirectorRunner } from './hooks/useDirectorRunner';
import { ActionCards } from './components/ActionCards';
import { ModuleShell } from '@/ui/shell/ModuleShell';
import { TerminalBlock } from '@/ui/components/TerminalBlock';

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
      <ModuleShell
        title="DIRECTOR"
        subtitle="GROQ AI OPS"
        chips={<span className={`director-status ${status}`}>{status.toUpperCase()}</span>}
      />

      <div className="panel">
        <div className="panel-title">Groq / Status</div>
        <div className="mb-sm text-xs">
          <span className={`director-status ${status}`}>{status.toUpperCase()}</span>
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
        </div>
        {cfg.proxyUrl && (
          <div className="text-xs text-dim mb-sm">
            Proxy: {cfg.proxyUrl.slice(0, 48)}
            {cfg.proxyUrl.length > 48 ? '…' : ''}
          </div>
        )}
        <button type="button" className="btn btn-sm" disabled={loading} onClick={testConnection}>
          Проверить связь
        </button>
        {testMsg && <div className="text-xs text-dim" style={{ marginTop: 8 }}>{testMsg}</div>}
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

      <details className="os-accordion">
        <summary>DEEP ANALYSIS · 14–30D</summary>
        <div className="os-accordion-body">
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
      </details>

      {output && (
        <div className="panel">
          <div className="panel-title">DIRECTOR OUTPUT</div>
          <TerminalBlock>{output}</TerminalBlock>
          {insight && !loading && insight.actions.length > 0 && (
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
