import type { SystemEvent } from '@/core/domain/types';

interface Props {
  events: SystemEvent[];
  collapsed: boolean;
  onToggle: () => void;
}

export function KernelLog({ events, collapsed, onToggle }: Props) {
  return (
    <footer className={`kernel ${collapsed ? 'kernel-collapsed' : ''}`}>
      <div className="kernel-header">
        <div className="kernel-title">KERNEL LOG</div>
        <button type="button" className="topbar-btn" onClick={onToggle}>
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      <div className="kernel-body">
        {events.length === 0 ? (
          <div className="kernel-line">— no events —</div>
        ) : (
          events.slice(0, 8).map((e) => (
            <div key={e.id} className={`kernel-line ${e.level}`}>
              [{new Date(e.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}]{' '}
              {e.module.toUpperCase()}: {e.message}
            </div>
          ))
        )}
      </div>
    </footer>
  );
}
