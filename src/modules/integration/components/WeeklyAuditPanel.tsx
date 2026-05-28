import { useEffect } from 'react';
import { afterWeeklyAuditComplete } from '@/core/engines/os-kernel';
import type { AiInsight } from '@/core/domain/types';
import { useDirectorRunner } from '@/modules/director/hooks/useDirectorRunner';
import { ActionCards } from '@/modules/director/components/ActionCards';
import { TerminalBlock } from '@/ui/components/TerminalBlock';

interface Props {
  onSaved: () => void;
}

export function WeeklyAuditPanel({ onSaved }: Props) {
  const {
    status,
    loading,
    output,
    insight,
    history,
    run,
    applyActions,
    selectInsight,
    refreshHistory,
  } = useDirectorRunner({ scope: 'integration', loadHistory: true, historyLimit: 30 });

  const auditHistory = history.filter((i) => i.taskId === 'weeklyAudit').slice(0, 10);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleRun = async () => {
    const res = await run('weeklyAudit');
    if (res.ok) {
      await afterWeeklyAuditComplete(res.insight);
      onSaved();
    }
  };

  const handleApply = async (selected: Parameters<typeof applyActions>[0]) => {
    await applyActions(selected);
    onSaved();
  };

  const loadFromHistory = (item: AiInsight) => {
    selectInsight(item);
  };

  return (
    <div className="panel">
      <div className="panel-title">Weekly System Audit · {status.toUpperCase()}</div>
      <button type="button" className="btn btn-primary" disabled={loading} onClick={handleRun}>
        Запустить Weekly Audit
      </button>
      {output && (
        <div className="mb-sm" style={{ marginTop: 12 }}>
          <TerminalBlock>{output}</TerminalBlock>
        </div>
      )}
      {insight && insight.actions.length > 0 && (
        <ActionCards actions={insight.actions} loading={loading} onApply={handleApply} />
      )}
      {auditHistory.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="panel-title" style={{ fontSize: 12 }}>
            История аудитов
          </div>
          {auditHistory.map((h) => (
            <button
              key={h.id}
              type="button"
              className="director-history-item"
              onClick={() => loadFromHistory(h)}
            >
              {h.createdAt.slice(0, 10)} — {h.text.slice(0, 72)}…
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
