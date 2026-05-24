import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import type { InfluenceEntry, InfluenceEntryType } from '@/core/domain/types';

const TYPE_LABELS: Record<InfluenceEntryType, string> = {
  mi: 'MI',
  nudge: 'Nudge',
  observation: 'Obs',
  debrief: 'Debrief',
  protocol: 'Protocol',
  bias: 'Bias',
};

function entryPreview(e: InfluenceEntry): string {
  if (e.type === 'mi') {
    return e.situation ?? e.context ?? '';
  }
  if (e.type === 'nudge') {
    return `${e.nudgeType ?? 'nudge'}: ${e.context ?? ''}`;
  }
  if (e.type === 'bias') {
    return `${e.biasName ?? 'bias'}: ${e.situation ?? ''}`;
  }
  if (e.type === 'protocol') {
    const checked = e.protocolChecks?.filter(Boolean).length ?? 0;
    return `Чеклист ${checked}/4`;
  }
  return e.context ?? e.situation ?? '';
}

interface Props {
  refreshKey?: number;
}

export function InfluenceJournalFeed({ refreshKey }: Props) {
  const [entries, setEntries] = useState<InfluenceEntry[]>([]);
  const [filter, setFilter] = useState<InfluenceEntryType | 'all'>('all');

  const load = async () => {
    const all = await db.influenceEntries.orderBy('date').reverse().limit(40).toArray();
    setEntries(
      filter === 'all' ? all.slice(0, 20) : all.filter((e) => e.type === filter).slice(0, 20)
    );
  };

  useEffect(() => {
    load();
  }, [filter, refreshKey]);

  return (
    <div className="panel">
      <div className="panel-title">Журнал влияния</div>
      <div style={{ marginBottom: 8 }}>
        <select
          className="select"
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as InfluenceEntryType | 'all')
          }
        >
          <option value="all">Все типы</option>
          {(Object.keys(TYPE_LABELS) as InfluenceEntryType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      {entries.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Записей пока нет.</p>
      )}
      {entries.map((e) => (
        <div key={e.id} className="kernel-line">
          {e.date} [{TYPE_LABELS[e.type]}] {entryPreview(e).slice(0, 72)}
          {entryPreview(e).length > 72 ? '…' : ''}
        </div>
      ))}
    </div>
  );
}
