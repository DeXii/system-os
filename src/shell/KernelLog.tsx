import type { SystemEvent } from '@/core/domain/types';

interface Props {
  events: SystemEvent[];
}

export function KernelLog({ events }: Props) {
  return (
    <footer className="kernel">
      <div className="kernel-title">Kernel log</div>
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
    </footer>
  );
}
