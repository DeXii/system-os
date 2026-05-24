import { SYNERGY_COPY } from '@/content/integration-protocols';
import { GlossaryZone } from '@/ui/glossary';
import { getSynergySummary } from '@/core/engines/integration-metrics';
import type { ReadinessScores } from '@/core/domain/types';
import { STAGE_LABELS } from '@/core/domain/types';

interface Props {
  readiness: ReadinessScores;
}

export function SynergyPanel({ readiness }: Props) {
  const s = getSynergySummary(readiness);

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
    </div>
  );
}
