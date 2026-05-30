import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { afterFactWrite } from './pipeline';

describe('afterFactWrite', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.domainEvents.clear();
  });

  it('does not persist READINESS_INVALIDATED to domainEvents', async () => {
    await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'meal_logged' });

    const count = await db.domainEvents.count();
    expect(count).toBe(0);
  });

  it('persists other domain events', async () => {
    await afterFactWrite({ type: 'DAY_BOOTSTRAPPED', date: '2026-05-31' });

    const events = await db.domainEvents.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('DAY_BOOTSTRAPPED');
  });
});
