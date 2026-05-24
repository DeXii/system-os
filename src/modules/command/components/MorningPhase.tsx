import type { ProtocolItem } from '@/core/domain/types';

interface Props {
  protocol: ProtocolItem[];
  briefingDone: boolean;
  directorLoading: boolean;
  onToggleProtocol: (p: ProtocolItem) => void;
  onBriefing: () => void;
  onQuickCapture: () => void;
}

export function MorningPhase({
  protocol,
  briefingDone,
  directorLoading,
  onToggleProtocol,
  onBriefing,
  onQuickCapture,
}: Props) {
  const critical = protocol.filter((p) => p.priority === 'critical');

  return (
    <div className="panel">
      <div className="panel-title">PHASE: MORNING</div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={directorLoading}
          onClick={onBriefing}
        >
          {briefingDone ? 'Briefing выполнен' : 'Утренний briefing (DIRECTOR)'}
        </button>
        <button type="button" className="btn btn-sm" onClick={onQuickCapture}>
          Quick capture
        </button>
        {briefingDone && <span className="tag done">BRIEFING OK</span>}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
        Протокол full-stack — приоритет critical ({critical.length} пунктов текущего этапа)
      </p>
      <ul className="mission-list">
        {protocol.map((p) => (
          <li key={p.id} className="check-row">
            <input type="checkbox" checked={p.done} onChange={() => onToggleProtocol(p)} />
            <span className={p.done ? 'tag done' : p.priority === 'critical' ? 'tag' : 'tag'}>
              [{p.stage}] {p.label}
              {p.priority === 'critical' ? ' · CRITICAL' : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
