import type { ModuleId, ModuleStatus } from '@/core/domain/types';

const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'command', label: 'COMMAND' },
  { id: 'foundation', label: 'FOUNDATION' },
  { id: 'regulation', label: 'REGULATION' },
  { id: 'mind', label: 'MIND' },
  { id: 'influence', label: 'INFLUENCE' },
  { id: 'library', label: 'LIBRARY' },
  { id: 'integration', label: 'INTEGRATION' },
  { id: 'director', label: 'DIRECTOR' },
  { id: 'archive', label: 'ARCHIVE' },
];

interface Props {
  active: ModuleId;
  statuses: Record<ModuleId, ModuleStatus>;
  onSelect: (id: ModuleId) => void;
}

export function Dock({ active, statuses, onSelect }: Props) {
  return (
    <nav className="dock">
      {MODULES.map((m) => {
        const st = statuses[m.id] ?? 'active';
        return (
          <button
            key={m.id}
            type="button"
            className={`dock-item ${active === m.id ? 'active' : ''} ${st === 'degraded' ? 'degraded' : ''}`}
            onClick={() => onSelect(m.id)}
          >
            <span className={`dock-status ${st === 'degraded' ? 'degraded' : ''}`} />
            {m.label}
          </button>
        );
      })}
    </nav>
  );
}
