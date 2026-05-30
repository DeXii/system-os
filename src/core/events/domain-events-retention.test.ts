import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { pruneDomainEvents, retentionCutoff } from './domain-events-retention';

describe('pruneDomainEvents', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.domainEvents.clear();
  });

  it('deletes events older than 30 days and keeps recent ones', async () => {
    const cutoff = retentionCutoff(30);
    await db.domainEvents.bulkAdd([
      {
        id: 'old-1',
        type: 'MISSION_COMPLETED',
        timestamp: '2020-01-01T12:00:00.000Z',
        payload: { date: '2020-01-01' },
      },
      {
        id: 'fresh-1',
        type: 'MISSION_COMPLETED',
        timestamp: new Date().toISOString(),
        payload: { date: '2026-05-31' },
      },
    ]);

    const removed = await pruneDomainEvents(30);
    expect(removed).toBe(1);

    const remaining = await db.domainEvents.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe('fresh-1');
    expect(remaining[0]?.timestamp >= cutoff).toBe(true);
  });
});
