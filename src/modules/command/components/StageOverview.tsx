import { STAGES } from '@/content/stages';
import { STAGE_LABELS, type OperatorProfile, type StageProgressState } from '@/core/domain/types';
import { getGateProgress, isMaxStage } from '@/core/engines/stage-progression';

interface Props {
  profile: OperatorProfile;
  progress: StageProgressState;
}

export function StageOverview({ profile, progress }: Props) {
  const gate = getGateProgress(progress, profile.currentStage);
  const evaluation = gate.evaluation;
  const maxed = isMaxStage(profile.currentStage);
  const current = STAGES.find((s) => s.id === profile.currentStage);

  return (
    <div className="panel">
      <div className="panel-title">STAGES · {profile.codename}</div>
      {!maxed && evaluation && (
        <div className="mb-sm text-xs" style={{ color: 'var(--accent)' }}>
          GATE {gate.qualifyingDays}/{gate.qualifyingRequired} · SCORE {evaluation.softScore}% ·{' '}
          {evaluation.blockersMet ? 'BLOCKERS OK' : 'BLOCKERS —'}
        </div>
      )}
      {current && (
        <div className="stage-card mb-sm">
          <strong>
            {current.number}. {current.name} ← ACTIVE
          </strong>
          <div className="text-xs text-dim" style={{ marginTop: 4 }}>
            {current.goal}
          </div>
          <div className="text-xs" style={{ marginTop: 4, color: 'var(--accent)' }}>
            → {current.result}
          </div>
          <div className="text-xs text-dim" style={{ marginTop: 4 }}>
            STREAK {progress.stageStreaks[current.id] ?? 0}D
          </div>
        </div>
      )}
      <details className="os-accordion">
        <summary>STAGE DETAIL · ALL 4</summary>
        <div className="os-accordion-body">
          {STAGES.map((s) => (
            <div
              key={s.id}
              className="stage-card"
              style={
                s.id === profile.currentStage ? { borderLeftColor: 'var(--success)' } : undefined
              }
            >
              <strong>
                {s.number}. {s.name}
                {s.id === profile.currentStage ? ' ←' : ''}
              </strong>
              <div className="text-xs text-dim" style={{ marginTop: 4 }}>
                {s.goal}
              </div>
              <div className="text-xs text-dim" style={{ marginTop: 2 }}>
                {s.methods}
              </div>
              <div className="text-xs" style={{ marginTop: 4, color: 'var(--accent)' }}>
                → {s.result}
              </div>
              <div className="text-xs text-dim" style={{ marginTop: 4 }}>
                STREAK {progress.stageStreaks[s.id] ?? 0}D
              </div>
            </div>
          ))}
          <div className="text-xs text-dim" style={{ marginTop: 8 }}>
            FOCUS: {STAGE_LABELS[profile.currentStage]}
          </div>
        </div>
      </details>
    </div>
  );
}
