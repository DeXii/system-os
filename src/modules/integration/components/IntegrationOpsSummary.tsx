import { useEffect, useState } from 'react';
import { TASK_KEYS } from '@/content/task-keys';
import { buildIntegrationDirective, formatIntegrationDirectiveForPrompt } from '@/core/engines/integration-directive';
import { getIntegrationOpsSummary } from '@/core/engines/integration-metrics';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { db } from '@/core/db';
import { getStageProgress } from '@/core/engines/stage-progression';
import type { OperatorProfile, ReadinessScores } from '@/core/domain/types';

interface Props {
  readiness: ReadinessScores;
  profile: OperatorProfile;
  onRefresh?: () => void;
}

export function IntegrationOpsSummary({ readiness, profile, onRefresh }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getIntegrationOpsSummary>> | null>(
    null
  );
  const [directiveText, setDirectiveText] = useState<string | null>(null);
  const [hints, setHints] = useState<string[]>([]);

  const load = async () => {
    const ops = await getIntegrationOpsSummary(readiness);
    setStats(ops);
    const [pdp, progress] = await Promise.all([
      db.pdp.toCollection().first(),
      getStageProgress(),
    ]);
    const directive = await buildIntegrationDirective({
      readiness,
      ops,
      profile,
      progress,
      pdp: pdp ?? null,
      gateEval: progress.lastGateSnapshot ?? null,
    });
    setDirectiveText(formatIntegrationDirectiveForPrompt(directive));
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

  const delta = stats.readinessDelta7d;

  return (
    <div className="panel">
      <div className="panel-title">INTEGRATION Ops — 7 дней</div>
      {hints.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          {hints.join(' · ')}
        </p>
      )}
      {directiveText && (
        <pre
          style={{
            fontSize: 11,
            fontFamily: 'var(--mono)',
            whiteSpace: 'pre-wrap',
            marginBottom: 8,
            color: 'var(--text-dim)',
          }}
        >
          {directiveText}
        </pre>
      )}
      <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
        <div>Compliance avg: {stats.complianceAvg7d}%</div>
        <div>Debrief rate: {stats.debriefRate7d}%</div>
        <div>
          Audit: {stats.daysSinceAudit == null ? 'никогда' : `${stats.daysSinceAudit} дн назад`}
        </div>
        <div>PDP: {stats.pdpCompletionPct}%</div>
        <div>Synergy index: {stats.synergyIndex}</div>
        <div>Gap: {stats.synergyGap}</div>
        <div>Mind chess 7d: {stats.mindOps7d.chessMinutes7d} мин</div>
        <div>Influence MI 7d: {stats.influenceOps7d.miCount7d}</div>
        <div>Regulation streak 14d: {stats.regulationStreak}</div>
        <div>
          Δ7d: F{delta.foundation >= 0 ? '+' : ''}
          {delta.foundation} R{delta.regulation >= 0 ? '+' : ''}
          {delta.regulation} M{delta.mind >= 0 ? '+' : ''}
          {delta.mind} I{delta.influence >= 0 ? '+' : ''}
          {delta.influence}
        </div>
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
