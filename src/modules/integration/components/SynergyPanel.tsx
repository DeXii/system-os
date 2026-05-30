import { useEffect, useState } from 'react';
import { SYNERGY_COPY } from '@/content/integration-protocols';
import { GlossaryZone } from '@/ui/glossary';
import { buildIntegrationDirective, formatIntegrationDirectiveForPrompt } from '@/core/engines/integration-directive';
import { getIntegrationOpsSummary, getSynergySummary } from '@/core/engines/integration-metrics';
import { db } from '@/core/db';
import { getStageProgress } from '@/core/engines/stage-progression';
import type { OperatorProfile, ReadinessScores } from '@/core/domain/types';
import { STAGE_LABELS } from '@/core/domain/types';

interface Props {
  readiness: ReadinessScores;
  profile: OperatorProfile;
}

export function SynergyPanel({ readiness, profile }: Props) {
  const s = getSynergySummary(readiness);
  const [directiveLine, setDirectiveLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ops = await getIntegrationOpsSummary(readiness);
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
      if (!cancelled) {
        setDirectiveLine(formatIntegrationDirectiveForPrompt(directive));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readiness.global, profile.currentStage]);

  return (
    <div className="panel">
      <div className="panel-title">{SYNERGY_COPY.title}</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          {SYNERGY_COPY.bottleneckHint}
        </p>
      </GlossaryZone>
      <div className="grid-4">
        {(['foundation', 'regulation', 'mind', 'influence'] as const).map((k) => (
          <div
            key={k}
            className={`metric-card ${s.hasBottleneck && k === s.weakestStage ? 'metric-weak' : ''}`}
          >
            <div className="metric-value">{readiness[k]}</div>
            <div className="metric-label">{STAGE_LABELS[k].split(' ')[0]}</div>
          </div>
        ))}
      </div>
      <GlossaryZone>
        <p style={{ marginTop: 12, fontSize: 12, fontFamily: 'var(--mono)' }}>
          Bottleneck: {s.bottleneck} · Global: {s.global}
        </p>
      </GlossaryZone>
      <div style={{ color: 'var(--accent)', marginTop: 6, fontSize: 12 }}>{s.recommendation}</div>
      {directiveLine && (
        <pre
          style={{
            marginTop: 8,
            fontSize: 11,
            fontFamily: 'var(--mono)',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-dim)',
          }}
        >
          {directiveLine}
        </pre>
      )}
    </div>
  );
}
