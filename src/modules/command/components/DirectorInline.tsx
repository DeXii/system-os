import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import { runDirectorTask, type TaskId } from '@/core/ai/director-service';
import type { AiInsight } from '@/core/domain/types';
import { ActionCards } from '@/modules/director/components/ActionCards';

interface Props {
  onApplied: () => void;
}

export function DirectorInline({ onApplied }: Props) {
  const [output, setOutput] = useState('');
  const [lastInsight, setLastInsight] = useState<AiInsight | null>(null);
  const [history, setHistory] = useState<AiInsight[]>([]);

  const loadHistory = async () => {
    const all = await db.aiInsights.orderBy('createdAt').reverse().limit(20).toArray();
    const cmd = all.filter((i) => i.scope === 'command').slice(0, 3);
    setHistory(cmd);
    if (cmd[0]) setLastInsight(cmd[0]);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const apply = async (selected: AiInsight['actions']) => {
    if (!selected.length) return;
    const { applyAiActions } = await import('@/core/ai/director-service');
    await applyAiActions(selected);
    setOutput((o) => o + '\n\n[Действия применены к OS]');
    onApplied();
  };

  return (
    <div className="panel">
      <div className="panel-title">DIRECTOR — Inline (COMMAND)</div>
      {output && (
        <div className="director-output markdown-body" style={{ marginBottom: '0.75rem' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12 }}>{output}</pre>
        </div>
      )}
      {lastInsight && lastInsight.actions.length > 0 && (
        <ActionCards
          actions={lastInsight.actions}
          compact
          onApply={apply}
        />
      )}
      {history.length > 0 && (
        <details>
          <summary className="mind-hint" style={{ fontSize: 11, cursor: 'pointer' }}>
            История insights ({history.length})
          </summary>
          {history.map((h) => (
            <pre
              key={h.id}
              style={{ fontSize: 10, marginTop: 4, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}
            >
              [{h.taskId}] {h.text.slice(0, 200)}...
            </pre>
          ))}
        </details>
      )}
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
        Полная панель DIRECTOR — справа. Кнопки briefing/debrief также в фазах MORNING/EVENING.
      </p>
    </div>
  );
}

export async function runCommandDirectorTask(
  taskId: TaskId,
  setLoading: (v: boolean) => void,
  setOutput: (v: string) => void,
  setInsight: (i: AiInsight | null) => void,
  onDone: () => void
): Promise<void> {
  setLoading(true);
  setOutput('Запрос к Groq...');
  const res = await runDirectorTask(taskId, { scope: 'command' });
  setLoading(false);
  if (!res.ok) {
    setOutput(res.error);
    return;
  }
  setInsight(res.insight);
  setOutput(res.insight.text);
  onDone();
}
