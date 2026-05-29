import { describe, expect, it } from 'vitest';
import { EXPORT_VERSION } from './export-import';
import { mergeSnapshots, type ExportSnapshot } from './snapshot-merge';

function snap(partial: Partial<ExportSnapshot>): ExportSnapshot {
  return {
    version: EXPORT_VERSION,
    exportedAt: '2026-01-01T00:00:00.000Z',
    missions: [],
    dailyLogs: [],
    dbMeta: [],
    ...partial,
  };
}

describe('mergeSnapshots', () => {
  it('keeps both local and remote rows by id', () => {
    const local = snap({
      missions: [{ id: 'm1', title: 'Local only', revision: 1, updatedAt: '2026-01-01' }],
      dbMeta: [{ id: 'db-meta', globalRevision: 2, lastUpdated: '2026-01-02' }],
    });
    const remote = snap({
      missions: [{ id: 'm2', title: 'Remote only', revision: 1, updatedAt: '2026-01-01' }],
      dbMeta: [{ id: 'db-meta', globalRevision: 1, lastUpdated: '2026-01-01' }],
    });
    const merged = mergeSnapshots(local, remote);
    const missions = merged.missions as { id: string }[];
    expect(missions.map((m) => m.id).sort()).toEqual(['m1', 'm2']);
  });

  it('picks higher revision on conflict', () => {
    const local = snap({
      missions: [
        { id: 'm1', title: 'Old', revision: 1, updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
      dbMeta: [{ id: 'db-meta', globalRevision: 1, lastUpdated: '2026-01-01' }],
    });
    const remote = snap({
      missions: [
        { id: 'm1', title: 'New', revision: 3, updatedAt: '2026-01-02T00:00:00.000Z' },
      ],
      dbMeta: [{ id: 'db-meta', globalRevision: 5, lastUpdated: '2026-01-03' }],
    });
    const merged = mergeSnapshots(local, remote);
    const mission = (merged.missions as { title: string }[])[0];
    expect(mission.title).toBe('New');
  });
});
