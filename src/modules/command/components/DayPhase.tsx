import type { Mission, StageId } from '@/core/domain/types';

interface Props {
  missions: Mission[];
  currentStage: StageId;
  onToggleMission: (m: Mission) => void;
}

function MissionGroup({
  title,
  items,
  currentStage,
  onToggle,
}: {
  title: string;
  items: Mission[];
  currentStage: StageId;
  onToggle: (m: Mission) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{title}</div>
      <ul className="mission-list">
        {items.map((m) => {
          const isMaintenance =
            m.frequencyTier === 'maintenance' || (m.stage !== currentStage && m.stage);
          const isActive = m.stage === currentStage && m.frequencyTier !== 'maintenance';
          return (
            <li
              key={m.id}
              className={`mission-item ${m.priority === 'critical' ? 'critical' : ''}`}
            >
              <input
                type="checkbox"
                checked={m.status === 'done'}
                onChange={() => onToggle(m)}
              />
              <div>
                <div className="mission-title">{m.title}</div>
                <span className="tag">{m.stage}</span>
                {isMaintenance && <span className="tag"> maintenance</span>}
                {isActive && <span className="tag"> active</span>}
                {m.source === 'director' && <span className="tag"> DIRECTOR</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DayPhase({ missions, currentStage, onToggleMission }: Props) {
  const critical = missions.filter((m) => m.priority === 'critical');
  const routine = missions.filter((m) => m.priority === 'routine');
  const optional = missions.filter((m) => m.priority === 'optional');

  return (
    <div className="panel">
      <div className="panel-title">PHASE: DAY — Active Missions</div>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        Порядок выполнения — см. TODAY QUEUE выше. Здесь — статус миссий по приоритету.
      </p>
      <MissionGroup
        title="CRITICAL"
        items={critical}
        currentStage={currentStage}
        onToggle={onToggleMission}
      />
      <MissionGroup
        title="ROUTINE"
        items={routine}
        currentStage={currentStage}
        onToggle={onToggleMission}
      />
      <MissionGroup
        title="OPTIONAL"
        items={optional}
        currentStage={currentStage}
        onToggle={onToggleMission}
      />
    </div>
  );
}
