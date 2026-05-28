import type { ModuleId, ModuleStatus } from '@/core/domain/types';

const MODULES: { id: ModuleId; label: string; abbr: string }[] = [
  { id: 'command', label: 'COMMAND', abbr: 'CMD' },
  { id: 'foundation', label: 'FOUNDATION', abbr: 'FND' },
  { id: 'nutrition', label: 'NUTRITION', abbr: 'NUT' },
  { id: 'regulation', label: 'REGULATION', abbr: 'REG' },
  { id: 'mind', label: 'MIND', abbr: 'MND' },
  { id: 'influence', label: 'INFLUENCE', abbr: 'INF' },
  { id: 'library', label: 'LIBRARY', abbr: 'LIB' },
  { id: 'integration', label: 'INTEGRATION', abbr: 'INT' },
  { id: 'director', label: 'DIRECTOR', abbr: 'DIR' },
  { id: 'prompt', label: 'PROMPT', abbr: 'PRM' },
  { id: 'archive', label: 'ARCHIVE', abbr: 'ARC' },
];

interface Props {
  active: ModuleId;
  statuses: Record<ModuleId, ModuleStatus>;
  onSelect: (id: ModuleId) => void;
  variant?: 'sidebar' | 'bottom';
  compact?: boolean;
}

export function Dock({ active, statuses, onSelect, variant = 'sidebar', compact = false }: Props) {
  const className = [
    'dock',
    variant === 'bottom' ? 'dock--bottom' : 'dock--sidebar',
    compact ? 'dock--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={className} aria-label="Module navigation">
      {MODULES.map((m) => {
        const st = statuses[m.id] ?? 'active';
        return (
          <button
            key={m.id}
            type="button"
            title={m.label}
            className={`dock-item ${active === m.id ? 'active' : ''} ${st === 'degraded' ? 'degraded' : ''}`}
            onClick={() => onSelect(m.id)}
          >
            <span className={`dock-status ${st === 'degraded' ? 'degraded' : ''}`} />
            <span className="dock-abbr">{m.abbr}</span>
            <span className="dock-label">{m.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
