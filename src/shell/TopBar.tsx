import { useEffect, useState } from 'react';
import { STAGE_LABELS } from '@/core/domain/types';
import type { OperatorProfile, ReadinessScores } from '@/core/domain/types';
import { computeOperatorMode, type OperatorMode } from '@/core/engines/operator-mode';
import type { Breakpoint } from '@/hooks/useBreakpoint';

interface Props {
  readiness: ReadinessScores;
  profile: OperatorProfile | null;
  breakpoint: Breakpoint;
  kernelOpen: boolean;
  onToggleKernel: () => void;
  directorOpen: boolean;
  onToggleDirector: () => void;
  showDirectorToggle: boolean;
}

export function TopBar({
  readiness,
  profile,
  breakpoint,
  kernelOpen,
  onToggleKernel,
  directorOpen,
  onToggleDirector,
  showDirectorToggle,
}: Props) {
  const [operatorMode, setOperatorMode] = useState<OperatorMode | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    computeOperatorMode(readiness).then(setOperatorMode);
  }, [readiness]);

  const now = new Date();
  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const isMobile = breakpoint === 'mobile';

  return (
    <header className="topbar">
      <span className="topbar-brand">AYANAKOJI OS</span>
      {!isMobile && (
        <span className="topbar-stat">
          {time} · {date}
        </span>
      )}
      <span className="topbar-stat topbar-stat--secondary">
        OP: <strong>{profile?.codename ?? '—'}</strong>
      </span>
      <span className="topbar-stat topbar-stat--secondary">
        STG: <strong>{profile ? STAGE_LABELS[profile.currentStage] : '—'}</strong>
      </span>
      <span className="topbar-stat topbar-stat--secondary" title={operatorMode?.rationale}>
        MODE: <strong>{operatorMode?.label ?? '—'}</strong>
      </span>
      <span className="topbar-stat topbar-stat--secondary">
        SYS: <strong>ACTIVE</strong>
      </span>
      <div className="topbar-readiness">
        <span className="topbar-stat">
          RDY <strong>{readiness.global}</strong>
        </span>
        <div className="readiness-bar">
          <div className="readiness-fill" style={{ width: `${readiness.global}%` }} />
        </div>
      </div>
      <div className="topbar-actions">
        {(breakpoint === 'mobile' || breakpoint === 'tablet') && (
          <button
            type="button"
            className={`topbar-btn ${statsOpen ? 'active' : ''}`}
            onClick={() => setStatsOpen((s) => !s)}
            aria-expanded={statsOpen}
          >
            STAT
          </button>
        )}
        <button
          type="button"
          className={`topbar-btn ${kernelOpen ? 'active' : ''}`}
          onClick={onToggleKernel}
          title="Kernel log"
        >
          KRN
        </button>
        {showDirectorToggle && (
          <button
            type="button"
            className={`topbar-btn ${directorOpen ? 'active' : ''}`}
            onClick={onToggleDirector}
            title="Director panel"
          >
            DIR
          </button>
        )}
      </div>
      {statsOpen && (breakpoint === 'mobile' || breakpoint === 'tablet') && (
        <div className="topbar-drawer" role="dialog">
          <span className="topbar-stat">
            {time} · {date}
          </span>
          <span className="topbar-stat">
            OP: <strong>{profile?.codename ?? '—'}</strong>
          </span>
          <span className="topbar-stat">
            STG: <strong>{profile ? STAGE_LABELS[profile.currentStage] : '—'}</strong>
          </span>
          <span className="topbar-stat">
            MODE: <strong>{operatorMode?.label ?? '—'}</strong>
          </span>
        </div>
      )}
    </header>
  );
}
