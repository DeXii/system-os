import type { ContextSliceId, DirectorLayeredPayload } from './context-slice-types';
import { foundationSliceFlags } from './slice-groups';

function mergeField(
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  if (value === undefined) return;
  target[key] = value;
}

function mergeFoundation(
  target: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
  slices: ContextSliceId[]
): void {
  if (!source) return;
  const flags = foundationSliceFlags(slices);
  const prev = (target.foundation as Record<string, unknown> | undefined) ?? {};
  const next: Record<string, unknown> = { ...prev };

  if (slices.includes('foundation.equipment')) {
    next.equipmentConstraints = source.equipmentConstraints;
  }
  if (slices.includes('foundation.planToday')) {
    next.workoutPlanToday = source.workoutPlanToday;
  }
  if (slices.includes('foundation.calibration')) {
    next.calibration = source.calibration;
  }
  if (flags.needCatalog) {
    next.allowedExerciseIds = source.allowedExerciseIds;
    next.exerciseCatalog = source.exerciseCatalog;
    next.referenceWorkoutTemplates = source.referenceWorkoutTemplates;
  }
  if (flags.needFullTraining) {
    Object.assign(next, {
      fitnessLevels: source.fitnessLevels,
      trainingParams: source.trainingParams,
      loadModifiers: source.loadModifiers,
      gppRotationNext: source.gppRotationNext,
      workoutTypeStats: source.workoutTypeStats,
      activeWorkoutRequest: source.activeWorkoutRequest,
      setLogsByKind: source.setLogsByKind,
      cardioSessionsInWindow: source.cardioSessionsInWindow,
      setLogsSummary: source.setLogsSummary,
      recentSetLogs: source.recentSetLogs,
      trainingSessionsInWindow: source.trainingSessionsInWindow,
      workoutPlansInWindow: source.workoutPlansInWindow,
      bftHistory: source.bftHistory,
      acftHistory: source.acftHistory,
    });
  } else if (flags.needLightOnly) {
    next.setLogsSummary = source.setLogsSummary;
    next.workoutPlanToday = source.workoutPlanToday ?? next.workoutPlanToday;
    next.fitnessLevels = source.fitnessLevels;
  }

  if (Object.keys(next).length > 0) {
    target.foundation = next;
  }
}

function mergeRegulationFact(
  target: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
  slices: ContextSliceId[]
): void {
  if (!source) return;
  const prev = (target.regulation as Record<string, unknown> | undefined) ?? {};
  const next: Record<string, unknown> = { ...prev };

  if (
    slices.some((s) =>
      ['regulation.metrics', 'regulation.logs', 'regulation.directive', 'derived.regulation'].includes(s)
    )
  ) {
    Object.assign(next, {
      hrvZToday: source.hrvZToday,
      hrvRecent: source.hrvRecent,
      breathing7d: source.breathing7d,
      fusionReadiness: source.fusionReadiness,
      maskBurden7d: source.maskBurden7d,
      dailyLogToday: source.dailyLogToday,
      pstEfficacy7d: source.pstEfficacy7d,
      mindfulnessInWindow: source.mindfulnessInWindow,
      stressLogsInWindow: source.stressLogsInWindow,
    });
  }
  if (slices.includes('regulation.logs')) {
    next.pstRecent = source.pstRecent;
    next.triggerLogsInWindow = source.triggerLogsInWindow;
    next.regulationStreak = source.regulationStreak;
  }
  if (slices.includes('regulation.directive')) {
    next.regulationDirective = source.regulationDirective;
  }

  if (Object.keys(next).length > 0) {
    target.regulation = next;
  }
}

export function applySliceFilter(
  layered: {
    fact: Record<string, unknown>;
    derived: Record<string, unknown>;
    hints: Record<string, unknown>;
  },
  slices: ContextSliceId[]
): { fact: Record<string, unknown>; derived: Record<string, unknown>; hints: Record<string, unknown> } {
  const fact: Record<string, unknown> = {};
  const derived: Record<string, unknown> = {};
  const hints: Record<string, unknown> = {};
  const srcFact = layered.fact;
  const srcDerived = layered.derived;
  const srcHints = layered.hints;

  for (const slice of slices) {
    switch (slice) {
      case 'operator.min':
        mergeField(fact, 'operator', srcFact.operator);
        break;
      case 'operatorMode':
        mergeField(fact, 'operatorMode', srcDerived.operatorMode ?? srcFact.operatorMode);
        break;
      case 'schedule.today':
        mergeField(fact, 'schedule', {
          ...((srcFact.schedule as Record<string, unknown>) ?? {}),
          todayQueue: (srcFact.schedule as Record<string, unknown>)?.todayQueue,
          pendingSlots: (srcFact.schedule as Record<string, unknown>)?.pendingSlots,
        });
        break;
      case 'schedule.week':
        mergeField(fact, 'schedule', {
          ...((fact.schedule as Record<string, unknown>) ?? {}),
          ...((srcFact.schedule as Record<string, unknown>) ?? {}),
          weekTemplateDays: (srcFact.schedule as Record<string, unknown>)?.weekTemplateDays,
        });
        break;
      case 'today.missions':
        mergeField(fact, 'today', {
          ...((fact.today as Record<string, unknown>) ?? {}),
          missions: (srcFact.today as Record<string, unknown>)?.missions,
          briefingDone: (srcFact.today as Record<string, unknown>)?.briefingDone,
          debriefDone: (srcFact.today as Record<string, unknown>)?.debriefDone,
        });
        break;
      case 'today.protocol':
        mergeField(fact, 'today', {
          ...((fact.today as Record<string, unknown>) ?? {}),
          protocol: (srcFact.today as Record<string, unknown>)?.protocol,
        });
        break;
      case 'today.dailyLog':
        mergeField(fact, 'today', {
          ...((fact.today as Record<string, unknown>) ?? {}),
          dailyLog: (srcFact.today as Record<string, unknown>)?.dailyLog,
        });
        break;
      case 'yesterday.pendingMissions':
        mergeField(fact, 'yesterdayPendingMissions', srcFact.yesterdayPendingMissions);
        break;
      case 'compliance.today':
      case 'compliance.yesterday':
      case 'compliance.trend':
        mergeField(fact, 'compliance', srcDerived.compliance ?? srcFact.compliance);
        break;
      case 'readiness.summary':
        mergeField(derived, 'readiness', srcDerived.readiness);
        mergeField(derived, 'moduleStatuses', srcDerived.moduleStatuses);
        break;
      case 'stageProgress.summary':
      case 'stageProgress.gate':
        mergeField(derived, 'stageProgress', srcDerived.stageProgress);
        break;
      case 'constraints':
        mergeField(hints, 'constraints', srcHints.constraints);
        mergeField(hints, 'aiMode', srcHints.aiMode);
        break;
      case 'ruleHints':
        mergeField(hints, 'ruleHints', srcHints.ruleHints);
        break;
      case 'foundation.training':
      case 'foundation.training.light':
      case 'foundation.catalog':
      case 'foundation.planToday':
      case 'foundation.equipment':
      case 'foundation.calibration':
        mergeFoundation(fact, srcFact.foundation as Record<string, unknown>, slices);
        break;
      case 'regulation.metrics':
      case 'regulation.logs':
      case 'regulation.directive':
        mergeRegulationFact(fact, srcFact.regulation as Record<string, unknown>, slices);
        break;
      case 'derived.regulation':
      case 'derived.regulation.bridge':
        mergeField(derived, 'regulation', srcDerived.regulation);
        break;
      case 'mind.cognitive': {
        const mind = (srcFact.mind as Record<string, unknown>) ?? {};
        const mindDerived = (srcDerived.mind as Record<string, unknown>) ?? {};
        mergeField(fact, 'mind', {
          ...((fact.mind as Record<string, unknown>) ?? {}),
          mindDirective: mindDerived.mindDirective ?? mind.mindDirective,
          mindParams: mind.mindParams,
          chessTrendInWindow: mind.chessTrendInWindow,
          cognitiveThrottle: mindDerived.cognitiveThrottle ?? mind.cognitiveThrottle,
          studySessionsInWindow: mind.studySessionsInWindow,
        });
        mergeField(derived, 'mind', {
          ...((derived.mind as Record<string, unknown>) ?? {}),
          ops7d: mindDerived.ops7d,
          cognitiveThrottle: mindDerived.cognitiveThrottle,
          mindDirective: mindDerived.mindDirective,
        });
        break;
      }
      case 'mind.decisions':
        mergeField(fact, 'mind', {
          ...((fact.mind as Record<string, unknown>) ?? {}),
          recentDecisions: (srcFact.mind as Record<string, unknown>)?.recentDecisions,
          recentScenarios: (srcFact.mind as Record<string, unknown>)?.recentScenarios,
        });
        break;
      case 'mind.decisions.light':
        mergeField(fact, 'mind', {
          ...((fact.mind as Record<string, unknown>) ?? {}),
          pendingDecisionFollowUps: (srcFact.mind as Record<string, unknown>)
            ?.pendingDecisionFollowUps,
        });
        break;
      case 'influence.network':
      case 'influence.network.light':
        mergeField(fact, 'influence', {
          ...((fact.influence as Record<string, unknown>) ?? {}),
          contacts: (srcFact.influence as Record<string, unknown>)?.contacts,
          contactsSummary: (srcFact.influence as Record<string, unknown>)?.contactsSummary,
          throttle: (srcDerived.influence as Record<string, unknown>)?.throttle,
        });
        break;
      case 'influence.entries':
        mergeField(fact, 'influence', {
          ...((fact.influence as Record<string, unknown>) ?? {}),
          recentEntries: (srcFact.influence as Record<string, unknown>)?.recentEntries,
        });
        break;
      case 'influence.directive':
        mergeField(fact, 'influence', {
          ...((fact.influence as Record<string, unknown>) ?? {}),
          influenceDirective: (srcFact.influence as Record<string, unknown>)?.influenceDirective,
        });
        mergeField(derived, 'influence', {
          ...((derived.influence as Record<string, unknown>) ?? {}),
          ops7d: (srcDerived.influence as Record<string, unknown>)?.ops7d,
        });
        break;
      case 'nutrition.day':
      case 'nutrition.directive':
        mergeField(fact, 'nutrition', srcFact.nutrition);
        mergeField(derived, 'nutrition', srcDerived.nutrition);
        break;
      case 'integration.weekly':
        mergeField(fact, 'integration', srcDerived.integration);
        break;
      case 'library.reading':
        mergeField(fact, 'readingProgress', srcFact.readingProgress);
        break;
      case 'operations.active':
        mergeField(fact, 'operations', {
          active: (srcFact.operations as Record<string, unknown>)?.active,
          overdue: (srcFact.operations as Record<string, unknown>)?.overdue,
        });
        break;
      case 'doctrine.rules':
        mergeField(fact, 'doctrine', srcFact.doctrine);
        break;
      case 'recent.summary':
        mergeField(fact, 'recent', srcFact.recent);
        break;
      default:
        break;
    }
  }

  return { fact, derived, hints };
}

export function buildLayeredPayload(
  meta: Omit<DirectorLayeredPayload, 'fact' | 'derived' | 'hints'>,
  fullLayered: {
    fact: Record<string, unknown>;
    derived: Record<string, unknown>;
    hints: Record<string, unknown>;
  },
  slices: ContextSliceId[],
  mode: 'full' | 'minimal'
): DirectorLayeredPayload {
  if (mode === 'full') {
    return { ...meta, ...fullLayered };
  }
  const filtered = applySliceFilter(fullLayered, slices);
  return { ...meta, ...filtered };
}
