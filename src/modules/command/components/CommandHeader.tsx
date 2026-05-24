import { STAGE_LABELS } from '@/core/domain/types';
import type { DayReport, OperatorProfile, ReadinessScores } from '@/core/domain/types';

interface Props {
  profile: OperatorProfile | null;
  readiness: ReadinessScores;
  dayReport: DayReport | null;
}

export function CommandHeader({ profile, readiness, dayReport }: Props) {
  const compliance = dayReport?.compliance ?? 0;

  return (
    <div className="panel" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
          <div className="panel-title">COMMAND CENTER</div>
          {profile && (
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Этап: <strong style={{ color: 'var(--accent)' }}>{STAGE_LABELS[profile.currentStage]}</strong>
            </p>
          )}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className="metric-value" style={{ fontSize: '1.75rem' }}>
            {readiness.global}
          </div>
          <div className="metric-label">GLOBAL READINESS</div>
        </div>
        <div style={{ minWidth: 120 }}>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>
            {compliance}%
          </div>
          <div className="metric-label">COMPLIANCE СЕГОДНЯ</div>
          <div className="readiness-bar" style={{ width: '100%', marginTop: 6 }}>
            <div className="readiness-fill" style={{ width: `${compliance}%` }} />
          </div>
        </div>
      </div>
      <div className="grid-4" style={{ marginTop: '1rem' }}>
        {(['foundation', 'regulation', 'mind', 'influence'] as const).map((k) => (
          <div key={k} className="metric-card">
            <div className="metric-value">{readiness[k]}</div>
            <div className="metric-label">{k.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
