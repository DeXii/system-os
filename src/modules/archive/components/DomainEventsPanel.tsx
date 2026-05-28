import { useCallback, useEffect, useState } from 'react';
import type { DomainEventRecord } from '@/core/domain/contracts/events';
import { listDomainEventsForReplay } from '@/core/events/replay';

export function DomainEventsPanel() {
  const [events, setEvents] = useState<DomainEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setEvents(await listDomainEventsForReplay(50));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="panel">
      <h3 className="panel-title">Domain events (debug)</h3>
      <p className="panel-hint">Последние 50 событий ядра OS для отладки и replay foundation.</p>
      <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
        Обновить
      </button>
      <ul className="kernel-log-list" style={{ marginTop: 8, maxHeight: 240, overflow: 'auto' }}>
        {events.map((e) => (
          <li key={e.id} style={{ fontSize: 11, marginBottom: 4 }}>
            <strong>{e.type}</strong>{' '}
            <span style={{ color: 'var(--text-dim)' }}>{e.timestamp.slice(0, 19)}</span>
            {Object.keys(e.payload).length > 0 && (
              <pre style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap', opacity: 0.85 }}>
                {JSON.stringify(e.payload).slice(0, 120)}
              </pre>
            )}
          </li>
        ))}
        {!loading && events.length === 0 && <li style={{ fontSize: 12 }}>Событий пока нет.</li>}
      </ul>
    </section>
  );
}
