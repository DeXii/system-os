import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { EXPORT_VERSION, exportSnapshotObject, validateImportPayload } from './export-import';

describe('export-import', () => {
  beforeAll(async () => {
    await db.open();
    await db.domainEvents.add({
      id: 'ev-1',
      type: 'DAY_BOOTSTRAPPED',
      timestamp: '2026-01-01T00:00:00.000Z',
      payload: { date: '2026-01-01' },
    });
  });

  afterAll(async () => {
    await db.close();
  });

  it('accepts domainEvents and dbMeta tables', () => {
    const payload = {
      version: EXPORT_VERSION,
      domainEvents: [{ id: '1', type: 'DAY_BOOTSTRAPPED', timestamp: '2026-01-01', payload: { date: '2026-01-01' } }],
      dbMeta: [],
    };
    const r = validateImportPayload(payload);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.version).toBe(EXPORT_VERSION);
  });

  it('includes domainEvents in full export', async () => {
    const snapshot = await exportSnapshotObject();
    expect(Array.isArray(snapshot.domainEvents)).toBe(true);
    expect((snapshot.domainEvents as unknown[]).length).toBeGreaterThan(0);
  });

  it('excludes domainEvents from cloud export', async () => {
    const snapshot = await exportSnapshotObject({ forCloud: true });
    expect(snapshot.domainEvents).toBeUndefined();
  });
});
