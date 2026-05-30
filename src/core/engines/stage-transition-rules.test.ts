import { describe, expect, it } from 'vitest';
import type { OperatorProfile, ReadinessScores, StageGateCriterion } from '../domain/types';
import {
  computeSoftScore,
  evaluateDemotionRisk,
  evaluateTransitionGates,
  isTodayQualifying,
  type StageGateContext,
} from './stage-transition-rules';

function baseCtx(overrides: Partial<StageGateContext> = {}): StageGateContext {
  const profile: OperatorProfile = {
    id: 'op',
    codename: 'test',
    goals: '',
    startDate: '2026-01-01',
    currentStage: 'foundation',
    unlockedStages: ['foundation'],
    ethicsAccepted: true,
    onboarded: true,
    createdAt: '2026-01-01',
  };
  const readiness: ReadinessScores = {
    foundation: 70,
    regulation: 65,
    mind: 60,
    influence: 55,
    global: 64,
  };
  return {
    profile,
    readiness,
    complianceAvg7d: 70,
    debriefRate7d: 80,
    briefingRate7d: 60,
    regulationStreak: 5,
    resonantBreath7d: 3,
    hrvDays7d: 4,
    mindStreak: 3,
    scenarios14d: 2,
    decisions14d: 1,
    cognitiveThrottle: false,
    bftDaysSince: 30,
    trainingSessions7d: 3,
    miCount14d: 1,
    readinessHistory: Array.from({ length: 10 }, (_, i) => ({
      date: `2026-05-${20 + i}`,
      foundation: 66,
      regulation: 60,
      mind: 55,
      influence: 50,
      global: 62,
      qualified: true,
    })),
    ...overrides,
  };
}

describe('stage-transition-rules', () => {
  it('computes soft score from weighted criteria', () => {
    const criteria: StageGateCriterion[] = [
      { id: 'a', label: 'a', met: true, current: '1', target: '1', weight: 10, severity: 'soft' },
      { id: 'b', label: 'b', met: false, current: '0', target: '1', weight: 10, severity: 'soft' },
    ];
    expect(computeSoftScore(criteria)).toBe(50);
  });

  it('requires all blockers and soft score for today qualifying', () => {
    const criteria: StageGateCriterion[] = [
      { id: 'b', label: 'b', met: true, current: '1', target: '1', weight: 10, severity: 'blocker' },
      { id: 's', label: 's', met: true, current: '1', target: '1', weight: 10, severity: 'soft' },
    ];
    expect(isTodayQualifying(criteria, 85)).toBe(true);
    expect(isTodayQualifying(criteria, 70)).toBe(false);
  });

  it('blocks advance when qualifying days insufficient', () => {
    const evalResult = evaluateTransitionGates(
      baseCtx({
        readiness: { foundation: 72, regulation: 65, mind: 60, influence: 55, global: 66 },
        readinessHistory: [],
      })
    );
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.reasons.some((r) => r.includes('Qualifying'))).toBe(true);
  });

  it('flags demotion when foundation/regulation collapse', () => {
    const history = Array.from({ length: 10 }, () => ({
      date: '2026-05-20',
      foundation: 35,
      regulation: 35,
      mind: 50,
      influence: 50,
      global: 40,
    }));
    const demotion = evaluateDemotionRisk(
      baseCtx({
        profile: { ...baseCtx().profile, currentStage: 'regulation' },
        readinessHistory: history,
      })
    );
    expect(demotion.atRisk).toBe(true);
    expect(demotion.targetStage).toBe('foundation');
  });
});
