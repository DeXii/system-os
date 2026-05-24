import { STAGES } from '@/content/stages';
import { STAGE_LABELS, type OperatorProfile, type StageProgressState } from '@/core/domain/types';
import { getGateProgress, isMaxStage } from '@/core/engines/stage-progression';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  profile: OperatorProfile;
  progress: StageProgressState;
}

export function StageOverview({ profile, progress }: Props) {
  const gate = getGateProgress(progress, profile.currentStage);
  const evaluation = gate.evaluation;
  const maxed = isMaxStage(profile.currentStage);

  return (
    <div className="panel">
      <div className="panel-title">4 ЭТАПА (PDF) — {profile.codename}</div>
      {!maxed && evaluation && (
        <GlossaryZone>
          <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: '0.75rem' }}>
            Stage gate: qualifying {gate.qualifyingDays}/{gate.qualifyingRequired} · soft score{' '}
            {evaluation.softScore}% · blockers {evaluation.blockersMet ? 'OK' : '—'}
          </p>
        </GlossaryZone>
      )}
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
            {s.id === profile.currentStage ? ' ← ТЕКУЩИЙ' : ''}
          </strong>
          <GlossaryZone>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Цель: {s.goal}</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Методы: {s.methods}</p>
          </GlossaryZone>
          <p style={{ fontSize: 12, color: 'var(--accent)' }}>→ {s.result}</p>
          <GlossaryZone>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              Streak: {progress.stageStreaks[s.id] ?? 0} дн. qualifying по этапу.
            </p>
          </GlossaryZone>
        </div>
      ))}
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
          Текущий фокус: {STAGE_LABELS[profile.currentStage]}. Streak — серия qualifying дней по
          этапу.
        </p>
      </GlossaryZone>
    </div>
  );
}
