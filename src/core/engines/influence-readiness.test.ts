import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import { computeInfluenceScore } from './influence-readiness';
import { INFLUENCE_THRESHOLDS } from './influence-thresholds';
import { getContactsSummary } from './contact-metrics';

describe('influence-readiness', () => {
  beforeEach(async () => {
    await db.open();
    await db.influenceEntries.clear();
    await db.contacts.clear();
    await db.operations.clear();
    await db.operatorInfluenceParams.clear();
  });

  afterEach(async () => {
    await db.close();
  });

  it('returns cold start without entries', async () => {
    expect(await computeInfluenceScore()).toBe(INFLUENCE_THRESHOLDS.coldStart);
  });

  it('scores higher with MI and protocol activity', async () => {
    await db.influenceEntries.bulkAdd([
      {
        id: 'mi1',
        date: '2026-05-28',
        type: 'mi',
        situation: 'a',
        openQuestions: 'b',
        summarize: 'c',
        outcome: 'успех',
      },
      {
        id: 'mi2',
        date: '2026-05-29',
        type: 'mi',
        situation: 'a',
        openQuestions: 'b',
        summarize: 'c',
      },
      { id: 'n1', date: '2026-05-30', type: 'nudge', context: 'x', outcome: 'ok' },
      { id: 'p1', date: '2026-05-30', type: 'protocol' },
      { id: 'p2', date: '2026-05-29', type: 'protocol' },
    ]);
    const score = await computeInfluenceScore();
    expect(score).toBeGreaterThan(INFLUENCE_THRESHOLDS.coldStart);
  });
});

describe('contact-metrics debrief', () => {
  beforeEach(async () => {
    await db.open();
    await db.influenceEntries.clear();
    await db.contacts.clear();
  });

  afterEach(async () => {
    await db.close();
  });

  it('flags contact needing debrief after MI without observation', async () => {
    await db.contacts.add({
      id: 'c1',
      codename: 'Alpha',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    await db.influenceEntries.add({
      id: 'e1',
      date: '2026-05-28',
      type: 'mi',
      contactId: 'c1',
      situation: 's',
      openQuestions: 'q',
      summarize: 'z',
    });
    const summary = await getContactsSummary();
    expect(summary.needingDebrief.some((c) => c.id === 'c1')).toBe(true);
  });

  it('does not flag after debrief', async () => {
    await db.contacts.add({
      id: 'c1',
      codename: 'Alpha',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    await db.influenceEntries.bulkAdd([
      {
        id: 'e1',
        date: '2026-05-28',
        type: 'mi',
        contactId: 'c1',
        situation: 's',
        openQuestions: 'q',
        summarize: 'z',
      },
      {
        id: 'e2',
        date: '2026-05-29',
        type: 'debrief',
        contactId: 'c1',
        context: 'done',
      },
    ]);
    const summary = await getContactsSummary();
    expect(summary.needingDebrief.some((c) => c.id === 'c1')).toBe(false);
  });
});
