import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { clearAllLocalOsData } from './factory-reset';
import { getDataSnapshotStats } from './export-import';

describe('clearAllLocalOsData', () => {
  beforeAll(async () => {
    await db.open();
    await db.operator.put({
      id: 'operator-1',
      codename: 'Test',
      goals: '',
      startDate: '2025-01-01',
      currentStage: 'foundation',
      unlockedStages: ['foundation'],
      ethicsAccepted: true,
      onboarded: true,
      createdAt: new Date().toISOString(),
    });
    await db.missions.add({
      id: 'm-1',
      date: '2025-01-01',
      title: 'Test mission',
      status: 'pending',
      priority: 'routine',
      stage: 'foundation',
    });
  });

  afterAll(async () => {
    await db.close();
  });

  it('clears all export tables', async () => {
    const before = await getDataSnapshotStats();
    expect(Object.values(before).some((n) => n > 0)).toBe(true);

    await clearAllLocalOsData();

    const after = await getDataSnapshotStats();
    expect(Object.values(after).every((n) => n === 0)).toBe(true);
  });

  it('clears glossaryCache', async () => {
    await db.glossaryCache.put({
      id: 'term:test',
      term: 'test',
      text: 'def',
      source: 'dict',
      updatedAt: new Date().toISOString(),
    });
    expect(await db.glossaryCache.count()).toBe(1);

    await clearAllLocalOsData();

    expect(await db.glossaryCache.count()).toBe(0);
  });
});
