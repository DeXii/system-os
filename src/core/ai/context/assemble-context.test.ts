import { describe, expect, it } from 'vitest';
import { splitLayeredContext } from '../context-builder';

describe('splitLayeredContext', () => {
  it('separates fact derived and hints', () => {
    const full = {
      operator: { codename: 'x' },
      schedule: { todayQueue: [] },
      today: { missions: [] },
      recent: {},
      yesterdayPendingMissions: [],
      foundation: { bftHistory: [] },
      regulation: {
        hrvRecent: [],
        readinessRegulation: 70,
        readinessFoundation: 60,
        hrvTrendInWindow: 1,
        hrvBaseline14d: 2,
      },
      mind: { ops7d: {}, cognitiveThrottle: true, recentScenarios: [] },
      influence: { ops7d: {}, throttle: false, recentEntries: [] },
      operations: { active: [] },
      doctrine: { rules: [] },
      readingProgress: {},
      readiness: { foundation: 60, regulation: 70, mind: 50, influence: 40, global: 55 },
      moduleStatuses: {},
      operatorMode: { mode: 'calculate' },
      stageProgress: {},
      compliance: {},
      integration: {},
      constraints: { aiMode: 'normal' },
      aiMode: 'normal',
      ruleHints: ['hint'],
    };

    const { fact, derived, hints } = splitLayeredContext(full as Record<string, unknown>);
    expect(fact.operator).toEqual({ codename: 'x' });
    expect(derived.readiness).toEqual(full.readiness);
    expect(hints.ruleHints).toEqual(['hint']);
    expect((derived.regulation as Record<string, unknown>).readinessRegulation).toBe(70);
    expect((fact.regulation as Record<string, unknown>).readinessRegulation).toBeUndefined();
  });
});
