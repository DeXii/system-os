import { getAllowedIdsForKind, getExercisesForKind } from '@/content/exercises';
import { getAllReferenceTemplatesForGroq } from '@/content/exercises/local-workout-templates';
import { BAR_EXERCISES } from '@/content/exercises-bars';
import { db, dateKeyDaysAgo, todayKey } from '../db';
import { getFitnessLevels, tierForWorkoutKind } from '../engines/progression-engine';
import { getRecommendedGppSubtype, getWorkoutTypeStat } from '../engines/workout-stats';
import { getTodayCompliance } from '../engines/command-compliance';
import { getReadiness, getRuleHints } from '../engines/readiness';
import { getModuleStatuses } from '../engines/stage-gates';
import { getStageProgress, getStreakProgress } from '../engines/stage-progression';
import { buildTodayQueue, getWeekTemplate } from '../engines/week-schedule';
import { getCalibration, getTodayWorkoutPlan } from '../engines/workout-planner';
import {
  getBreathing7dSummary,
  getHrvBaseline14d,
  getHrvTrend,
  getRegulationPractice14d,
} from '../engines/regulation-metrics';
import {
  getChessRatingTrend,
  getMindOpsSummary,
  shouldThrottleCognitiveLoad,
} from '../engines/mind-metrics';
import { truncateUntrustedText } from './prompts/untrusted-text';
import {
  getInfluenceOpsSummary,
  shouldThrottleInfluence,
} from '../engines/influence-metrics';
import {
  getIntegrationOpsSummary,
  getLastWeeklyAudit,
  getPyramidStageScores,
  getSynergySummary,
} from '../engines/integration-metrics';
import { getReadingProgressByLevel } from '../engines/library-books';
import type { GppSubtype, SetLog, WorkoutKind } from '../domain/types';
import { buildContextConstraints } from './constraints-builder';
import { EQUIPMENT_ALLOWED, EQUIPMENT_FORBIDDEN } from './prompts/rules/equipment.rules';

export type ContextLookbackDays = 7 | 14 | 30;

export function sinceForLookback(lookbackDays: ContextLookbackDays): string {
  return dateKeyDaysAgo(lookbackDays - 1);
}

function filterDated<T extends { date: string }>(items: T[], since: string): T[] {
  return items.filter((e) => e.date >= since);
}

async function buildSetLogsSummary(since: string) {
  const logs = await db.setLogs.where('date').aboveOrEqual(since).toArray();
  const byExercise = new Map<
    string,
    { exerciseId: string; sessions: number; lastDate: string; avgActual: number; avgTarget: number }
  >();
  for (const log of logs) {
    const prev = byExercise.get(log.exerciseId);
    if (!prev) {
      byExercise.set(log.exerciseId, {
        exerciseId: log.exerciseId,
        sessions: 1,
        lastDate: log.date,
        avgActual: log.actualReps,
        avgTarget: log.targetReps,
      });
    } else {
      const sessions = prev.sessions + 1;
      byExercise.set(log.exerciseId, {
        exerciseId: log.exerciseId,
        sessions,
        lastDate: log.date > prev.lastDate ? log.date : prev.lastDate,
        avgActual: (prev.avgActual * prev.sessions + log.actualReps) / sessions,
        avgTarget: (prev.avgTarget * prev.sessions + log.targetReps) / sessions,
      });
    }
  }
  return [...byExercise.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

function omitExerciseCatalog(
  foundation: Record<string, unknown>,
  effectiveScope: string
): Record<string, unknown> {
  if (effectiveScope === 'foundation') return foundation;
  const f = { ...foundation };
  delete f.exerciseCatalog;
  return f;
}

export function splitLayeredContext(fullContext: Record<string, unknown>): {
  fact: Record<string, unknown>;
  derived: Record<string, unknown>;
  hints: Record<string, unknown>;
} {
  const regulation = fullContext.regulation as Record<string, unknown>;
  const {
    readinessRegulation,
    readinessFoundation,
    hrvTrendInWindow,
    hrvBaseline14d,
    ...regulationFact
  } = regulation;
  const mind = fullContext.mind as Record<string, unknown>;
  const { cognitiveThrottle, ops7d: mindOps7d, ...mindFact } = mind;
  const influence = fullContext.influence as Record<string, unknown>;
  const { throttle, ops7d: influenceOps7d, ...influenceFact } = influence;

  return {
    fact: {
      operator: fullContext.operator,
      schedule: fullContext.schedule,
      today: fullContext.today,
      recent: fullContext.recent,
      yesterdayPendingMissions: fullContext.yesterdayPendingMissions,
      foundation: fullContext.foundation,
      regulation: regulationFact,
      mind: mindFact,
      influence: influenceFact,
      operations: fullContext.operations,
      doctrine: fullContext.doctrine,
      readingProgress: fullContext.readingProgress,
    },
    derived: {
      readiness: fullContext.readiness,
      moduleStatuses: fullContext.moduleStatuses,
      operatorMode: fullContext.operatorMode,
      stageProgress: fullContext.stageProgress,
      compliance: fullContext.compliance,
      integration: fullContext.integration,
      regulation: { readinessRegulation, readinessFoundation, hrvTrendInWindow, hrvBaseline14d },
      mind: { ops7d: mindOps7d, cognitiveThrottle },
      influence: { ops7d: influenceOps7d, throttle },
    },
    hints: {
      constraints: fullContext.constraints,
      aiMode: fullContext.aiMode,
      ruleHints: fullContext.ruleHints,
    },
  };
}

function selectContextPayload(
  layered: Record<string, unknown>,
  effectiveScope: string
): Record<string, unknown> {
  const fact = layered.fact as Record<string, unknown>;
  const derived = layered.derived as Record<string, unknown>;
  const hints = layered.hints as Record<string, unknown>;

  if (
    effectiveScope === 'full' ||
    effectiveScope === 'director' ||
    effectiveScope === 'archive'
  ) {
    return { ...layered, scope: effectiveScope };
  }

  const scoped: Record<string, unknown> = {
    date: layered.date,
    contextLookbackDays: layered.contextLookbackDays,
    contextSinceDate: layered.contextSinceDate,
    scope: effectiveScope,
    fact: { ...fact },
    derived: { ...derived },
    hints: { ...hints },
  };

  const foundation = fact.foundation as Record<string, unknown>;
  const regulationDerived = derived.regulation as Record<string, unknown>;

  const factScoped = scoped.fact as Record<string, unknown>;
  const derivedScoped = scoped.derived as Record<string, unknown>;
  const regulationFact = fact.regulation as Record<string, unknown>;

  switch (effectiveScope) {
    case 'command':
      factScoped.foundation = {
        equipmentConstraints: foundation.equipmentConstraints,
        workoutPlanToday: foundation.workoutPlanToday,
        setLogsSummary: foundation.setLogsSummary,
        allowedExerciseIds: foundation.allowedExerciseIds,
      };
      factScoped.regulation = {
        hrvRecent: regulationFact.hrvRecent,
        breathing7d: regulationFact.breathing7d,
      };
      derivedScoped.regulation = {
        hrvTrendInWindow: regulationDerived.hrvTrendInWindow,
        readinessRegulation: regulationDerived.readinessRegulation,
        readinessFoundation: regulationDerived.readinessFoundation,
      };
      break;
    case 'foundation':
      factScoped.foundation = omitExerciseCatalog(foundation, effectiveScope);
      delete factScoped.regulation;
      delete factScoped.mind;
      delete factScoped.influence;
      break;
    case 'regulation':
      factScoped.regulation = fact.regulation;
      factScoped.foundation = { equipmentConstraints: foundation.equipmentConstraints };
      derivedScoped.regulation = derived.regulation;
      delete factScoped.mind;
      delete factScoped.influence;
      break;
    case 'mind':
      delete factScoped.foundation;
      delete factScoped.regulation;
      delete factScoped.influence;
      break;
    case 'influence':
      delete factScoped.foundation;
      delete factScoped.regulation;
      delete factScoped.mind;
      break;
    case 'library':
      factScoped.mind = { readingProgress: (fact.mind as Record<string, unknown>)?.readingProgress };
      delete factScoped.foundation;
      delete factScoped.regulation;
      delete factScoped.influence;
      break;
    case 'integration':
      factScoped.foundation = { bftHistory: foundation.bftHistory };
      derivedScoped.regulation = { hrvTrendInWindow: regulationDerived.hrvTrendInWindow };
      delete factScoped.influence;
      break;
    default:
      break;
  }

  if (factScoped.foundation && typeof factScoped.foundation === 'object') {
    factScoped.foundation = omitExerciseCatalog(
      factScoped.foundation as Record<string, unknown>,
      effectiveScope
    );
  }

  return scoped;
}

export interface WorkoutContextOptions {
  kind: WorkoutKind;
  gppSubtype?: GppSubtype;
}

export async function buildDirectorContext(
  scope?: string,
  lookbackDays: ContextLookbackDays = 7,
  workoutContext?: WorkoutContextOptions
): Promise<string> {
  const { getCachedContextJson, contextCacheKey } = await import('../cache/context-cache');
  return getCachedContextJson(
    contextCacheKey(scope, lookbackDays, workoutContext?.kind),
    () => buildDirectorContextUncached(scope, lookbackDays, workoutContext)
  );
}

async function buildDirectorContextUncached(
  scope?: string,
  lookbackDays: ContextLookbackDays = 7,
  workoutContext?: WorkoutContextOptions
): Promise<string> {
  const today = todayKey();
  const yesterday = dateKeyDaysAgo(1);
  const since = sinceForLookback(lookbackDays);

  const profile = await db.operator.toCollection().first();
  const readiness = await getReadiness();
  const hints = await getRuleHints();
  const statuses = getModuleStatuses(readiness);
  const progress = await getStageProgress();
  const complianceToday = await getTodayCompliance(today);

  const missions = await db.missions.where('date').equals(today).toArray();
  const protocol = await db.protocolItems.where('date').equals(today).toArray();
  const dailyLog = await db.dailyLogs.where('date').equals(today).first();

  const acftInWindow = filterDated(
    await db.acftEvents.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));
  const acftHistory = acftInWindow;
  const lastAcft = acftHistory[0] ?? null;

  const bftHistory = filterDated(
    await db.bftEvents.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));

  const hrvInWindow = filterDated(
    await db.hrvEntries.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));
  const lastHrv = hrvInWindow;

  const hrvTrend = await getHrvTrend(lookbackDays);
  const hrvBaseline = await getHrvBaseline14d();
  const breathing7d = await getBreathing7dSummary();
  const regulationStreak = await getRegulationPractice14d();
  const stressLogsInWindow = filterDated(
    await db.stressLogs.where('date').aboveOrEqual(since).toArray(),
    since
  );
  const mindfulInWindow = filterDated(
    await db.mindfulnessSessions.where('date').aboveOrEqual(since).toArray(),
    since
  );
  const pstRecent = filterDated(
    await db.pstEntries.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));

  const trainingSessions = filterDated(
    await db.trainingSessions.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));

  const workoutPlansHistory = filterDated(
    await db.workoutPlans.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));

  const yesterdayPending = await db.missions
    .where('date')
    .equals(yesterday)
    .filter((m) => m.status === 'pending')
    .toArray();

  const yesterdayReport = await db.dayReports.where('date').equals(yesterday).first();
  const todayReport = await db.dayReports.where('date').equals(today).first();

  const reportsInWindow = filterDated(
    await db.dayReports.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => a.date.localeCompare(b.date));
  const complianceTrend = reportsInWindow.map((r) => ({
    date: r.date,
    compliance: r.compliance,
    debriefDone: r.debriefDone,
  }));

  const streakInfo = profile
    ? getStreakProgress(progress, profile.currentStage)
    : null;

  const todayQueue = await buildTodayQueue(today);
  const weekTemplate = await getWeekTemplate();
  const calibration = await getCalibration();
  const workoutPlan = await getTodayWorkoutPlan(today);
  const setLogsSummary = await buildSetLogsSummary(since);
  const recentSetLogs = filterDated(
    await db.setLogs.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));

  const regulationBlock = {
    hrvTrendInWindow: hrvTrend,
    hrvBaseline14d: hrvBaseline,
    hrvRecent: lastHrv,
    breathing7d,
    mindfulnessInWindow: mindfulInWindow.length,
    stressLogsInWindow: stressLogsInWindow.length,
    regulationStreak,
    pstRecent,
    readinessRegulation: readiness.regulation,
    readinessFoundation: readiness.foundation,
    constraintKey: 'regulation.wimHof',
  };

  const { getOrCreateDoctrine } = await import('../engines/doctrine-service');
  const { getActiveContactsForContext, getContactsSummary } = await import(
    '../engines/contact-metrics'
  );
  const { getActiveOperations, getOverdueOperations } = await import(
    '../engines/operation-metrics'
  );
  const { getPendingDecisionFollowUps } = await import('../engines/decision-followup');
  const { computeOperatorMode } = await import('../engines/operator-mode');

  const doctrine = await getOrCreateDoctrine();
  const activeContacts = await getActiveContactsForContext();
  const contactsSummary = await getContactsSummary();
  const activeOps = await getActiveOperations();
  const overdueOps = await getOverdueOperations();
  const pendingFollowUps = await getPendingDecisionFollowUps();
  const triggerLogsRecent = filterDated(
    await db.triggerLogs.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));
  const studyRecent = filterDated(
    await db.studySessions.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));
  const operatorMode = await computeOperatorMode(readiness);

  const mindOps = await getMindOpsSummary();
  const chessTrend = await getChessRatingTrend(lookbackDays);
  const recentScenarios = filterDated(
    await db.scenarios.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));
  const recentDecisions = filterDated(
    await db.decisionLogs.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));
  const readingProgress = await getReadingProgressByLevel();
  const cognitiveThrottle = shouldThrottleCognitiveLoad(readiness);

  const regulationBlockWithTriggers = {
    ...regulationBlock,
    triggerLogsInWindow: triggerLogsRecent.slice(0, 8),
  };

  const mindBlock = {
    chessTrendInWindow: chessTrend,
    ops7d: mindOps,
    recentScenarios,
    recentDecisions,
    studySessionsInWindow: studyRecent,
    pendingDecisionFollowUps: pendingFollowUps.map((d) => ({
      id: d.id,
      title: d.title,
      followUpDueDate: d.followUpDueDate,
      expectedOutcome: d.expectedOutcome?.slice(0, 100),
    })),
    readingProgress,
    cognitiveThrottle,
    constraintKey: 'mind.cognitiveThrottle',
  };

  const influenceOps = await getInfluenceOpsSummary();
  const recentInfluence = filterDated(
    await db.influenceEntries.where('date').aboveOrEqual(since).toArray(),
    since
  ).sort((a, b) => b.date.localeCompare(a.date));
  const influenceThrottle = shouldThrottleInfluence(readiness);

  const influenceBlock = {
    ops7d: influenceOps,
    recentEntries: recentInfluence,
    throttle: influenceThrottle,
    contacts: activeContacts.map((c) => ({
      id: c.id,
      codename: c.codename,
      role: c.role,
      motives: c.motives?.slice(0, 120),
      disclosureNotes: c.disclosureNotes?.slice(0, 120),
    })),
    contactsSummary,
    constraintKey: 'influence.communication',
  };

  const pdp = await db.pdp.toCollection().first();
  const integrationOps = await getIntegrationOpsSummary(readiness);
  const lastWeeklyAudit = await getLastWeeklyAudit();

  const integrationBlock = {
    stages: getPyramidStageScores(readiness),
    synergy: getSynergySummary(readiness),
    ops7d: integrationOps,
    pdp: pdp ?? null,
    lastWeeklyAudit: lastWeeklyAudit
      ? { createdAt: lastWeeklyAudit.createdAt, preview: lastWeeklyAudit.text.slice(0, 200) }
      : null,
    constraintKey: 'integration.weekly',
  };

  const fitnessLevels = await getFitnessLevels();
  const gppRotationNext = await getRecommendedGppSubtype();
  const workoutStats: Record<string, { totalCount: number; lastDate: string | null }> = {};
  const kinds: WorkoutKind[] = [
    'hift',
    'gpp_push',
    'gpp_pull',
    'gpp_core',
    'gpp_legs',
    'warmup',
    'stretch',
    'cardio_intense',
    'cardio_easy',
  ];
  for (const k of kinds) {
    const s = await getWorkoutTypeStat(k);
    workoutStats[k] = { totalCount: s.totalCount, lastDate: s.lastDate };
  }

  const activeKind = workoutContext?.kind ?? 'legacy';
  const activeTier = tierForWorkoutKind(fitnessLevels, activeKind);
  const allowedForActive =
    activeKind === 'legacy'
      ? BAR_EXERCISES.map((e) => e.id)
      : getAllowedIdsForKind(activeKind, activeTier);

  const setLogsByKind: Record<string, typeof recentSetLogs> = {};
  for (const k of kinds) {
    setLogsByKind[k] = recentSetLogs.filter((l) => l.workoutKind === k);
  }

  const cardioSessionsInWindow = filterDated(
    await db.cardioSessions.where('date').aboveOrEqual(since).toArray(),
    since
  );

  const foundationBlock = {
    fitnessLevels: {
      hift: fitnessLevels.hift,
      gpp: fitnessLevels.gpp,
      warmup: fitnessLevels.warmup,
      stretch: fitnessLevels.stretch,
      manualOverride: fitnessLevels.manualOverride,
    },
    gppRotationNext,
    workoutTypeStats: workoutStats,
    activeWorkoutRequest: workoutContext ?? null,
    setLogsByKind,
    cardioSessionsInWindow: cardioSessionsInWindow,
    equipmentConstraints: {
      allowed: EQUIPMENT_ALLOWED,
      forbidden: EQUIPMENT_FORBIDDEN,
      constraintKey: 'foundation.equipment',
    },
    calibration,
    workoutPlanToday: workoutPlan ?? null,
    bftHistory,
    acftHistory,
    setLogsSummary,
    recentSetLogs: recentSetLogs.map((l: SetLog) => ({
      date: l.date,
      exerciseId: l.exerciseId,
      actualReps: l.actualReps,
      targetReps: l.targetReps,
      setIndex: l.setIndex,
    })),
    trainingSessionsInWindow: trainingSessions,
    workoutPlansInWindow: workoutPlansHistory.map((p) => ({
      date: p.date,
      status: p.status,
      exerciseCount: p.exercises.length,
      notes: p.notes ? truncateUntrustedText(p.notes, 500) : undefined,
    })),
    allowedExerciseIds: allowedForActive,
    exerciseCatalog:
      activeKind === 'legacy'
        ? BAR_EXERCISES.map((e) => ({
            id: e.id,
            name: e.name,
            pattern: e.pattern,
            equipment: e.equipment,
          }))
        : getExercisesForKind(activeKind, activeTier).map((e) => ({
            id: e.id,
            name: e.name,
            pattern: e.pattern,
            measure: e.measure,
            isStatic: e.isStatic,
          })),
    constraintKey: 'foundation.calibration',
    referenceWorkoutTemplates: {
      tierLabel: 'Начинающий (эталон структуры)',
      ...getAllReferenceTemplatesForGroq(),
    },
  };

  const constraints = buildContextConstraints(readiness, operatorMode, {
    cognitiveThrottle,
    influenceThrottle,
  });

  const fullContext = {
    date: today,
    contextLookbackDays: lookbackDays,
    contextSinceDate: since,
    scope: scope ?? 'full',
    constraints,
    aiMode: constraints.aiMode,
    operator: profile
      ? {
          codename: profile.codename,
          goals: profile.goals,
          currentStage: profile.currentStage,
          unlockedStages: profile.unlockedStages,
          startDate: profile.startDate,
        }
      : null,
    schedule: {
      todayQueue: todayQueue
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => ({
          rank: s.rank,
          title: s.title,
          type: s.type,
          taskKey: s.taskKey ?? s.id,
          status: s.status,
          stage: s.stage,
        })),
      weekTemplateDays: Object.keys(weekTemplate.slots).length,
      pendingSlots: todayQueue.filter((s) => s.status === 'pending').length,
    },
    foundation: foundationBlock,
    regulation: regulationBlockWithTriggers,
    mind: mindBlock,
    influence: influenceBlock,
    operations: {
      active: activeOps.map((o) => ({
        id: o.id,
        title: o.title,
        phase: o.phase,
        status: o.status,
        deadline: o.deadline,
        contactIds: o.contactIds,
      })),
      overdue: overdueOps.map((o) => ({ id: o.id, title: o.title, deadline: o.deadline })),
    },
    doctrine: { rules: doctrine.rules },
    operatorMode,
    integration: integrationBlock,
    readingProgress,
    readiness,
    moduleStatuses: statuses,
    ruleHints: hints,
    stageProgress: {
      stageStreaks: progress.stageStreaks,
      globalStreak: progress.globalStreak,
      pendingAdvance: progress.pendingAdvance,
      pendingDemotion: progress.pendingDemotion,
      qualifyingDays: progress.qualifyingDays,
      lastGateSnapshot: progress.lastGateSnapshot,
      failedBlockers:
        progress.lastGateSnapshot?.criteria
          .filter((c) => c.severity === 'blocker' && !c.met)
          .map((c) => ({ id: c.id, label: c.label, current: c.current, target: c.target })) ?? [],
      streakInfo,
    },
    compliance: {
      today: complianceToday,
      yesterday: yesterdayReport
        ? {
            compliance: yesterdayReport.compliance,
            debriefDone: yesterdayReport.debriefDone,
          }
        : null,
      trendInWindow: complianceTrend,
    },
    yesterdayPendingMissions: yesterdayPending.map((m) => ({
      id: m.id,
      title: m.title,
      priority: m.priority,
      stage: m.stage,
    })),
    today: {
      missions: missions.map((m) => ({
        title: m.title,
        priority: m.priority,
        status: m.status,
        stage: m.stage,
        taskKey: m.taskKey,
      })),
      protocol: protocol.map((p) => ({
        label: p.label,
        done: p.done,
        priority: p.priority,
        stage: p.stage,
        taskKey: p.taskKey,
      })),
      dailyLog: dailyLog
        ? {
            ...dailyLog,
            notes: dailyLog.notes
              ? truncateUntrustedText(dailyLog.notes, 500)
              : dailyLog.notes,
          }
        : null,
      briefingDone: todayReport?.briefingDone ?? false,
      debriefDone: todayReport?.debriefDone ?? false,
    },
    recent: {
      acft: lastAcft,
      bft: bftHistory[0] ?? null,
      hrv: lastHrv,
      training: trainingSessions,
    },
  };

  const effectiveScope = scope ?? 'full';
  const layeredParts = splitLayeredContext(
    fullContext as unknown as Record<string, unknown>
  );
  const layered = {
    date: today,
    contextLookbackDays: lookbackDays,
    contextSinceDate: since,
    scope: effectiveScope,
    ...layeredParts,
  };
  const payload = selectContextPayload(
    layered as unknown as Record<string, unknown>,
    effectiveScope
  );
  return JSON.stringify(payload);
}
