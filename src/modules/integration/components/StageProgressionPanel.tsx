import { useEffect, useState } from 'react';
import {
  confirmStageAdvance,
  confirmStageDemotion,
  evaluateStageProgression,
  getGateProgress,
  getStageProgress,
  isMaxStage,
} from '@/core/engines/stage-progression';
import type { OperatorProfile, StageProgressState } from '@/core/domain/types';
import { STAGE_LABELS } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  profile: OperatorProfile;
  onRefresh: () => void;
}

function GateChecklist({
  progress,
  profile,
}: {
  progress: StageProgressState;
  profile: OperatorProfile;
}) {
  const gate = getGateProgress(progress, profile.currentStage);
  const evaluation = gate.evaluation;

  if (isMaxStage(profile.currentStage)) {
    return (
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Максимальный этап достигнут. Поддерживайте maintenance и следите за stage demotion.
        </p>
      </GlossaryZone>
    );
  }

  if (!evaluation || evaluation.criteria.length === 0) {
    return (
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Stage gate: оценка qualifying days и soft score ещё не выполнена.
        </p>
      </GlossaryZone>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 12,
          fontFamily: 'var(--mono)',
          marginBottom: 8,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span>
          Qualifying: {gate.qualifyingDays}/{gate.qualifyingRequired} дн.
        </span>
        <span>
          Soft score: {evaluation.softScore}% (нужно ≥{gate.softScoreRequired}%)
        </span>
        <span>Blockers: {evaluation.blockersMet ? 'OK' : 'не выполнены'}</span>
      </div>
      <ul style={{ listStyle: 'none', fontSize: 12, margin: 0, padding: 0 }}>
        {evaluation.criteria.map((c) => (
          <li
            key={c.id}
            style={{
              padding: '4px 0',
              borderBottom: '1px solid var(--border)',
              color: c.met ? 'var(--success)' : 'var(--text-dim)',
            }}
          >
            <span style={{ marginRight: 6 }}>{c.met ? '✓' : '✗'}</span>
            <span style={{ color: c.severity === 'blocker' ? 'var(--text)' : 'var(--text-dim)' }}>
              {c.severity === 'blocker' ? '[B] ' : '[S] '}
              {c.label}: {c.current} → {c.target}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StageProgressionPanel({ profile, onRefresh }: Props) {
  const [progress, setProgress] = useState<StageProgressState | null>(null);

  const load = async () => {
    const evaluated = await evaluateStageProgression(profile);
    setProgress(evaluated);
  };

  useEffect(() => {
    load();
  }, [profile.currentStage]);

  if (!progress) return null;

  const handleAdvance = async (accept: boolean) => {
    await confirmStageAdvance(profile, accept);
    setProgress(await getStageProgress());
    onRefresh();
  };

  const handleDemotion = async (accept: boolean) => {
    await confirmStageDemotion(profile, accept);
    setProgress(await getStageProgress());
    onRefresh();
  };

  return (
    <div className="panel">
      <div className="panel-title">Stage Progression</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Stage progression — qualifying days, stage gate, stage advance или stage demotion по
          readiness всех этапов.
        </p>
      </GlossaryZone>

      <GateChecklist progress={progress} profile={profile} />

      {progress.pendingAdvance && (
        <div
          style={{ border: '1px solid var(--success)', padding: 12, borderRadius: 4, marginTop: 12 }}
        >
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Рекомендация: переход на <strong>{STAGE_LABELS[progress.pendingAdvance]}</strong>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleAdvance(true)}
            >
              Принять переход
            </button>
            <button type="button" className="btn btn-sm" onClick={() => handleAdvance(false)}>
              Отложить 7 дней
            </button>
          </div>
        </div>
      )}

      {progress.pendingDemotion && (
        <div
          style={{ border: '1px solid var(--danger)', padding: 12, borderRadius: 4, marginTop: 12 }}
        >
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Рекомендация отката на <strong>{STAGE_LABELS[progress.pendingDemotion]}</strong>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={() => handleDemotion(true)}>
              Принять откат
            </button>
            <button type="button" className="btn btn-sm" onClick={() => handleDemotion(false)}>
              Отложить 7 дней
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
