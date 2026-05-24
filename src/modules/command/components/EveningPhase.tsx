import type { ComplianceSnapshot } from '@/core/engines/command-compliance';

interface Props {
  compliance: ComplianceSnapshot;
  debriefDone: boolean;
  eveningNotes: string;
  directorLoading: boolean;
  onNotesChange: (v: string) => void;
  onDebrief: () => void;
}

export function EveningPhase({
  compliance,
  debriefDone,
  eveningNotes,
  directorLoading,
  onNotesChange,
  onDebrief,
}: Props) {
  return (
    <div className="panel">
      <div className="panel-title">PHASE: EVENING</div>
      <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
        <div className="metric-card">
          <div className="metric-value">{Math.round(compliance.protocolPct * 100)}%</div>
          <div className="metric-label">Протокол (40% веса)</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{Math.round(compliance.missionPct * 100)}%</div>
          <div className="metric-label">Миссии взвеш. (60%)</div>
        </div>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <div className="metric-label">COMPLIANCE</div>
        <div className="metric-value">{compliance.compliance}%</div>
        <div className="readiness-bar" style={{ width: '100%', marginTop: 6 }}>
          <div className="readiness-fill" style={{ width: `${compliance.compliance}%` }} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
          Формула: 40% протокол + 60% миссии (critical×2, routine×1, optional×0.5). Влияет на
          readiness этапа после debrief.
        </p>
      </div>
      <div className="form-row">
        <label className="label">Заметки вечера</label>
        <textarea
          className="textarea"
          value={eveningNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Краткий итог дня для DIRECTOR..."
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={directorLoading}
        onClick={onDebrief}
      >
        {debriefDone ? 'Debrief выполнен — обновить' : 'Вечерний debrief (DIRECTOR)'}
      </button>
      {debriefDone && <span className="tag done" style={{ marginLeft: 8 }}>DEBRIEF OK</span>}
    </div>
  );
}
