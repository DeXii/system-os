import { describe, expect, it } from 'vitest';
import type { PersonalDevelopmentPlan, ReadinessHistoryEntry, ReadinessScores } from '../domain/types';
import {
  computeReadinessDelta7d,
  computeSynergyGap,
  computeSynergyIndex,
  getPdpCompletionPct,
  getWeakestPyramidStage,
  getPyramidStageScores,
} from './integration-metrics';

const baseReadiness: ReadinessScores = {
  foundation: 70,
  regulation: 65,
  mind: 60,
  influence: 55,
  global: 64,
};

describe('integration-metrics', () => {
  it('detects balanced pyramid when spread ≤ 2', () => {
    const stages = getPyramidStageScores({
      foundation: 60,
      regulation: 61,
      mind: 62,
      influence: 60,
      global: 61,
    });
    expect(getWeakestPyramidStage(stages)).toBeNull();
  });

  it('picks earliest stage on tie at minimum', () => {
    const stages = getPyramidStageScores({
      foundation: 50,
      regulation: 50,
      mind: 70,
      influence: 70,
      global: 60,
    });
    const weakest = getWeakestPyramidStage(stages);
    expect(weakest?.stageId).toBe('foundation');
  });

  it('computes synergy gap and index', () => {
    expect(computeSynergyGap(baseReadiness)).toBe(15);
    expect(computeSynergyIndex(baseReadiness)).toBe(Math.round(64 - 0.4 * 15));
  });

  it('computes readiness delta vs 7d history', () => {
    const history: ReadinessHistoryEntry[] = [
      { date: '2026-05-24', foundation: 60, regulation: 60, mind: 60, influence: 60, global: 60 },
      { date: '2026-05-25', foundation: 62, regulation: 62, mind: 62, influence: 62, global: 62 },
    ];
    const delta = computeReadinessDelta7d(baseReadiness, history);
    expect(delta.foundation).toBe(70 - 61);
  });

  it('scores PDP completion with milestones', () => {
    const pdp: PersonalDevelopmentPlan = {
      id: 'pdp',
      quarter: '2026-Q2',
      northStar: 'Build OS',
      goals: ['g1'],
      weeklyFocus: 'integration',
      focusStage: 'foundation',
      milestones: [
        { id: 'm1', label: 'a', done: true },
        { id: 'm2', label: 'b', done: false },
      ],
      updatedAt: '2026-01-01',
    };
    expect(getPdpCompletionPct(pdp)).toBeGreaterThan(50);
    expect(getPdpCompletionPct(null)).toBe(0);
  });
});
