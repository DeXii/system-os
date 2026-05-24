import { useEffect, useState } from 'react';
import { TASK_KEYS } from '@/content/task-keys';
import { getIntegrationOpsSummary } from '@/core/engines/integration-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import type { ReadinessScores } from '@/core/domain/types';

interface Props {
  readiness: ReadinessScores;
  onRefresh?: () => void;
}

export function IntegrationOpsSummary({ readiness, onRefresh }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getIntegrationOpsSummary>> | null>(
    null
  );
  const [hints, setHints] = useState<string[]>([]);

  const load = async () => {
    setStats(await getIntegrationOpsSummary(readiness));
    const queueHints: string[] = [];
    const slot = await findSlotByTaskKey(TASK_KEYS.integrationWeeklyAudit);
    if (slot?.status === 'pending') {
      queueHints.push(`#${slot.rank} COMMAND: ${slot.title}`);
    }
    setHints(queueHints);
    onRefresh?.();
  };

  useEffect(() => {
    load();
  }, [readiness.global]);

  if (!stats) return null;

  return (
    <div className="panel">
      <div className="panel-title">INTEGRATION Ops — 7 дней</div>
      {hints.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          {hints.join(' · ')}
        </p>
      )}
      <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
        <div>Compliance avg: {stats.complianceAvg7d}%</div>
        <div>Debrief rate: {stats.debriefRate7d}%</div>
        <div>
          Audit: {stats.daysSinceAudit == null ? 'никогда' : `${stats.daysSinceAudit} дн назад`}
        </div>
        <div>PDP: {stats.pdpCompletionPct}%</div>
        {stats.stages.map((s) => (
          <div key={s.stageId}>
            Readiness · этап {s.stageNumber} ({s.stageId}): {s.score}
          </div>
        ))}
        <div>Bottleneck: {stats.synergy.bottleneck}</div>
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={load}>
        Обновить
      </button>
    </div>
  );
}
