import { useCallback, useEffect, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import { db } from '@/core/db';
import { getDirectorConfig } from '@/core/ai/director-service';
import { useDirectorStatus } from '@/hooks/useDirectorStatus';
import { getDataSnapshotStats } from '@/core/data/export-import';
import { subscribeKernel, subscribeOsRefresh } from '@/core/events/event-bus';

function maskProxy(url: string): string {
  if (!url) return '—';
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.length > 1 ? u.pathname.slice(0, 12) + '…' : ''}`;
  } catch {
    return url.slice(0, 32) + (url.length > 32 ? '…' : '');
  }
}

export function ArchiveOpsSummary() {
  const status = useDirectorStatus();
  const cfg = getDirectorConfig();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [lastInsight, setLastInsight] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);

  const load = useCallback(async () => {
    const counts = await getDataSnapshotStats();
    setStats(counts);
    setTotalRows(Object.values(counts).reduce((a, b) => a + b, 0));
    const last = await db.aiInsights.orderBy('createdAt').reverse().first();
    setLastInsight(last?.createdAt ?? null);
  }, []);

  useAsyncEffect(
    async (signal) => {
      await load();
      if (signal.aborted) return;
    },
    [load]
  );

  useEffect(() => {
    const unsubK = subscribeKernel(() => void load());
    const unsubR = subscribeOsRefresh(() => void load());
    return () => {
      unsubK();
      unsubR();
    };
  }, [load]);

  return (
    <div className="panel">
      <div className="panel-title">ARCHIVE Ops</div>
      <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
        <div>
          DIRECTOR: <span className={`director-status ${status}`}>{status.toUpperCase()}</span>
        </div>
        <div>Proxy: {maskProxy(cfg.proxyUrl)}</div>
        <div>Записей в IndexedDB: {stats ? totalRows : '…'}</div>
        <div>Insights: {stats?.aiInsights ?? '…'}</div>
        <div>
          Последний insight:{' '}
          {lastInsight ? lastInsight.slice(0, 16).replace('T', ' ') : 'нет'}
        </div>
        <div>Model: {cfg.model || '—'}</div>
      </div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => void load()}>
        Обновить
      </button>
    </div>
  );
}
