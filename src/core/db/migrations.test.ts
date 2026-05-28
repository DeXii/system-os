import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './index';

describe('Dexie v13 migration', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    await db.close();
  });

  it('exposes domainEvents dbMeta derivedSnapshots tables', () => {
    expect(db.domainEvents).toBeDefined();
    expect(db.dbMeta).toBeDefined();
    expect(db.derivedSnapshots).toBeDefined();
  });

  it('can persist dbMeta singleton', async () => {
    await db.dbMeta.put({
      id: 'db-meta',
      globalRevision: 1,
      lastUpdated: new Date().toISOString(),
      deviceId: 'test',
    });
    const meta = await db.dbMeta.get('db-meta');
    expect(meta?.globalRevision).toBe(1);
  });
});
