import { useCallback, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import type { DomainEventRecord } from '@/core/domain/contracts/events';
import {
  DOMAIN_EVENTS_RETENTION_DAYS,
  pruneDomainEvents,
} from '@/core/events/domain-events-retention';
import { listDomainEventsForReplay } from '@/core/events/replay';

export function DomainEventsPanel() {
  const [events, setEvents] = useState<DomainEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pruneMsg, setPruneMsg] = useState<string | null>(null);
  const [pruning, setPruning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setEvents(await listDomainEventsForReplay(50));
    setLoading(false);
  }, []);

  useAsyncEffect(
    async (signal) => {
      await load();
      if (signal.aborted) return;
    },
    [load]
  );

  const runRetention = async () => {
    setPruning(true);
    setPruneMsg(null);
    try {
      const removed = await pruneDomainEvents();
      setPruneMsg(`Удалено записей старше ${DOMAIN_EVENTS_RETENTION_DAYS} дней: ${removed}`);
      await load();
    } finally {
      setPruning(false);
    }
  };

  return (
    <section className="panel">
      <h3 className="panel-title">Domain events (debug)</h3>
      <p className="panel-hint">
        Последние 50 событий ядра OS для отладки. Retention: {DOMAIN_EVENTS_RETENTION_DAYS} дней.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button type="button" className="btn btn-sm" onClick={() => void load()} disabled={loading}>
          Обновить
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void runRetention()}
          disabled={pruning}
        >
          Применить retention ({DOMAIN_EVENTS_RETENTION_DAYS} дней)
        </button>
      </div>
      {pruneMsg && (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>{pruneMsg}</p>
      )}
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
