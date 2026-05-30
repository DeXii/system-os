import { describe, expect, it } from 'vitest';
import { applySliceFilter, buildLayeredPayload } from '../../context/apply-slice-filter';
import { splitLayeredContext } from '../../context-builder';
import { getContextManifest } from '../registry/context-manifest';
import { parseContextSnapshot } from '../validators/validate-actions';

function mockFullFlatContext(): Record<string, unknown> {
  return {
    operator: { codename: 'op', currentStage: 'I', goals: [] },
    schedule: { todayQueue: [{ taskKey: 'a' }], weekTemplateDays: 7, pendingSlots: 1 },
    today: {
      missions: [{ title: 'm' }],
      protocol: [{ label: 'p' }],
      dailyLog: null,
      briefingDone: false,
      debriefDone: false,
    },
    yesterdayPendingMissions: [],
    foundation: {
      allowedExerciseIds: ['hift_pullup'],
      exerciseCatalog: [{ id: 'hift_pullup' }],
      referenceWorkoutTemplates: { tierLabel: 't' },
      workoutPlanToday: null,
      equipmentConstraints: { allowed: [], forbidden: [] },
      setLogsSummary: [],
      cardioSessionsInWindow: [],
      fitnessLevels: {},
    },
    regulation: {
      hrvRecent: [],
      regulationDirective: '[РАСЧЁТ]',
      readinessRegulation: 70,
      readinessFoundation: 60,
      hrvTrendInWindow: 0,
      hrvBaseline14d: 0,
      breathing7d: {},
    },
    mind: {
      mindDirective: '[РАСЧЁТ]',
      recentDecisions: [],
      recentScenarios: [],
      pendingDecisionFollowUps: [],
      ops7d: {},
      cognitiveThrottle: false,
    },
    influence: {
      contacts: [{ id: 'c1' }],
      influenceDirective: 'x',
      recentEntries: [],
      ops7d: {},
      throttle: false,
    },
    nutrition: { nutritionDirective: 'n', ops7d: {} },
    operations: { active: [{ id: 'o1' }], overdue: [] },
    doctrine: { rules: ['r1'] },
    readingProgress: { level: 1 },
    readiness: { foundation: 70, regulation: 70, mind: 70, influence: 70 },
    moduleStatuses: {},
    operatorMode: { mode: 'calculate', rationale: '' },
    stageProgress: { failedBlockers: [], lastGateSnapshot: null },
    compliance: { today: {}, yesterday: null, trendInWindow: [] },
    integration: {
      integrationDirective: '[РАСЧЁТ]',
      stages: {},
      synergy: {},
      ops7d: {},
    },
    constraints: { flags: {}, aiMode: 'focus', aiModeHints: [] },
    aiMode: 'focus',
    ruleHints: ['hint'],
    recent: { acft: null, bft: null, hrv: [], training: [] },
  };
}

describe('task-scoped context assembly', () => {
  const fullLayered = () => splitLayeredContext(mockFullFlatContext());

  it('planHift excludes mind and influence from fact', () => {
    const manifest = getContextManifest('planHift');
    const payload = buildLayeredPayload(
      {
        date: '2026-05-31',
        contextLookbackDays: 7,
        contextSinceDate: '2026-05-25',
        scope: 'foundation',
        taskId: 'planHift',
      },
      fullLayered(),
      manifest.slices,
      'minimal'
    );
    expect(payload.fact.mind).toBeUndefined();
    expect(payload.fact.influence).toBeUndefined();
    expect(payload.fact.foundation).toBeDefined();
  });

  it('planHift minimal JSON is smaller than full JSON', () => {
    const fullPayload = buildLayeredPayload(
      {
        date: '2026-05-31',
        contextLookbackDays: 7,
        contextSinceDate: '2026-05-25',
        scope: 'full',
        taskId: 'freeCommand',
      },
      fullLayered(),
      getContextManifest('freeCommand').slices,
      'full'
    );
    const smallPayload = buildLayeredPayload(
      {
        date: '2026-05-31',
        contextLookbackDays: 7,
        contextSinceDate: '2026-05-25',
        scope: 'foundation',
        taskId: 'planHift',
      },
      fullLayered(),
      getContextManifest('planHift').slices,
      'minimal'
    );
    expect(JSON.stringify(smallPayload).length).toBeLessThan(
      JSON.stringify(fullPayload).length * 0.55
    );
  });

  it('parseContextSnapshot reads layered foundation catalog', () => {
    const snapshot = parseContextSnapshot(
      JSON.stringify({
        fact: {
          foundation: {
            allowedExerciseIds: ['hift_pullup'],
            exerciseCatalog: [{ id: 'hift_pullup', name: 'Pull' }],
          },
          schedule: { todayQueue: [{ taskKey: 'slot.a' }] },
        },
        derived: { readiness: { foundation: 1, regulation: 2, mind: 3, influence: 4 } },
        hints: { constraints: { flags: { cognitiveThrottle: true } } },
      })
    );
    expect(snapshot.allowedExerciseIds).toEqual(['hift_pullup']);
    expect(snapshot.todayTaskKeys).toEqual(['slot.a']);
    expect(snapshot.flags?.cognitiveThrottle).toBe(true);
  });

  it('mindCoach keeps mindDirective in fact or derived', () => {
    const filtered = applySliceFilter(fullLayered(), getContextManifest('mindCoach').slices);
    const factMind = (filtered.fact.mind as Record<string, unknown> | undefined)?.mindDirective;
    const derivedMind = (filtered.derived.mind as Record<string, unknown> | undefined)
      ?.mindDirective;
    expect(factMind ?? derivedMind).toBeTruthy();
  });
});
