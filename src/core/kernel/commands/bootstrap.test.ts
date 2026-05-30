import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';
import type { OperatorProfile } from '../../domain/types';
import { ensureDayBootstrapped } from './bootstrap';

const testDate = '2026-05-31';

const profile: OperatorProfile = {
  id: 'operator-bootstrap-test',
  codename: 'Test',
  goals: '',
  startDate: '2025-01-01',
  currentStage: 'foundation',
  unlockedStages: ['foundation'],
  ethicsAccepted: true,
  onboarded: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('ensureDayBootstrapped', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.domainEvents.clear();
    await db.dbMeta.clear();
    await db.missions.clear();
    await db.protocolItems.clear();
    await db.dayOverrides.clear();
    await db.operator.put(profile);
  });

  it('emits DAY_BOOTSTRAPPED only once per calendar day', async () => {
    await ensureDayBootstrapped(profile, testDate);
    await ensureDayBootstrapped(profile, testDate);

    const bootEvents = await db.domainEvents
      .where('type')
      .equals('DAY_BOOTSTRAPPED')
      .toArray();

    expect(bootEvents).toHaveLength(1);
    expect(bootEvents[0]?.payload).toEqual({ date: testDate });

    const meta = await db.dbMeta.get('db-meta');
    expect(meta?.lastBootstrappedDate).toBe(testDate);
  });
});
