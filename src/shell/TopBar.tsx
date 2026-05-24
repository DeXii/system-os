import { STAGE_LABELS } from '@/core/domain/types';
import type { OperatorProfile, ReadinessScores } from '@/core/domain/types';

interface Props {
  readiness: ReadinessScores;
  profile: OperatorProfile | null;
}

export function TopBar({ readiness, profile }: Props) {
  const now = new Date();
  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="topbar">
      <span className="topbar-brand">AYANAKOJI OS</span>
      <span className="topbar-stat">
        {time} · {date}
      </span>
      <span className="topbar-stat">
        OPERATOR: <strong>{profile?.codename ?? '—'}</strong>
      </span>
      <span className="topbar-stat">
        STAGE: <strong>{profile ? STAGE_LABELS[profile.currentStage] : '—'}</strong>
      </span>
      <span className="topbar-stat">SYSTEM STATUS: <strong>ACTIVE</strong></span>
      <div className="topbar-readiness">
        <span className="topbar-stat">
          READINESS <strong>{readiness.global}</strong>
        </span>
        <div className="readiness-bar">
          <div className="readiness-fill" style={{ width: `${readiness.global}%` }} />
        </div>
      </div>
    </header>
  );
}
