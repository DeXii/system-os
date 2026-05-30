import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { getInfluenceParams, updateInfluenceParamsFromMi } from './influence-params';
import type { InfluenceEntry } from '../domain/types';

describe('influence-params', () => {
  beforeEach(async () => {
    await db.open();
    await db.operatorInfluenceParams.clear();
  });

  afterEach(async () => {
    await db.close();
  });

  it('updates miDepth and miEfficacy from MI entry', async () => {
    const before = await getInfluenceParams();
    const entry: InfluenceEntry = {
      id: '1',
      date: '2026-05-30',
      type: 'mi',
      situation: 's',
      openQuestions: 'q',
      affirmReflect: 'a',
      summarize: 'z',
      whatWorked: 'w',
      outcome: 'успех',
    };
    await updateInfluenceParamsFromMi(entry);
    const after = await getInfluenceParams();
    expect(after.miDepthEma).toBeGreaterThan(before.miDepthEma);
    expect(after.miEfficacyEma).toBeGreaterThan(before.miEfficacyEma);
  });
});
