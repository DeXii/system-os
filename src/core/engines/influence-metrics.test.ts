import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db';
import type { ReadinessScores } from '../domain/types';
import { buildInfluenceDirective, shouldThrottleInfluence } from './influence-metrics';

const baseReadiness: ReadinessScores = {
  foundation: 60,
  regulation: 55,
  mind: 50,
  influence: 50,
  global: 55,
};

describe('influence-metrics', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.close();
  });

  it('shouldThrottleInfluence when foundation/regulation/mind low', () => {
    expect(shouldThrottleInfluence(baseReadiness)).toBe(false);
    expect(shouldThrottleInfluence({ ...baseReadiness, foundation: 40 })).toBe(true);
    expect(shouldThrottleInfluence({ ...baseReadiness, regulation: 35 })).toBe(true);
    expect(shouldThrottleInfluence({ ...baseReadiness, mind: 30 })).toBe(true);
  });

  it('buildInfluenceDirective includes deny line when throttled', async () => {
    const d = await buildInfluenceDirective({
      ...baseReadiness,
      foundation: 30,
      influence: 40,
    });
    expect(d.calculationLine).toMatch(/\[РАСЧЁТ\]/);
    expect(d.actionLine).toMatch(/\[ДЕЙСТВИЕ\]/);
    expect(d.denyLine).toMatch(/\[ОТКАЗ\]/);
    expect(d.calculationLine).toContain('throttle=1');
  });
});
