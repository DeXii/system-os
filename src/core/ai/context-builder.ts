import { getAllowedIdsForKind, getExercisesForKind } from '@/content/exercises';
import { getAllReferenceTemplatesForGroq } from '@/content/exercises/local-workout-templates';
import { BAR_EXERCISES } from '@/content/exercises-bars';
import { db, dateKeyDaysAgo, todayKey } from '../db';
import {
  DEFAULT_FITNESS_LEVELS,
  getFitnessLevels,
  tierForWorkoutKind,
} from '../engines/progression-engine';
import { getRecommendedGppSubtype, getWorkoutTypeStat } from '../engines/workout-stats';
import { getTodayCompliance } from '../engines/command-compliance';
import { getReadiness, getRuleHints } from '../engines/readiness';
import { getModuleStatuses } from '../engines/stage-gates';
import { getStageProgress, getStreakProgress } from '../engines/stage-progression';
import { buildTodayQueue, getWeekTemplate } from '../engines/week-schedule';
import { getCalibration, getTodayWorkoutPlan } from '../engines/workout-planner';
import {
  buildRegulationDirective,
  formatRegulationDirectiveForPrompt,
  getBreathing7dSummary,
  getFusionReadinessSignal,
  getHrvBaseline14d,
  getHrvTrend,
  getHrvZScoreToday,
  getMaskBurden7d,
  getPstEfficacy7d,
  getRegulationPractice14d,
  getResonantMinutes7d,
} from '../engines/regulation-metrics';
import { getRegulationParams } from '../engines/regulation-params';
import {
  buildMindDirective,
  formatMindDirectiveForPrompt,
  getChessRatingTrend,
  getMindOpsSummary,
  shouldThrottleCognitiveLoad,
} from '../engines/mind-metrics';
import { getMindParams } from '../engines/mind-params';
import { getActiveGoal } from '../engines/nutrition-goal-engine';
import {
  buildNutritionDirective,
  formatNutritionDirectiveForPrompt,
  getNutritionOpsSummary,
  getTodayNutritionDay,
} from '../engines/nutrition-metrics';
import { getNutritionParams } from '../engines/nutrition-params';
import { truncateUntrustedText } from './prompts/untrusted-text';
import {
  buildInfluenceDirective,
  formatInfluenceDirectiveForPrompt,
  getInfluenceOpsSummary,
  shouldThrottleInfluence,
} from '../engines/influence-metrics';
import { getInfluenceParams } from '../engines/influence-params';
import { buildIntegrationContextBundle } from '../engines/integration-context';
import {
  buildIntegrationDirective,
  formatIntegrationDirectiveForPrompt,
} from '../engines/integration-directive';
import { getLastWeeklyAudit, getPyramidStageScores, getSynergySummary } from '../engines/integration-metrics';
import { getIntegrationParams } from '../engines/integration-params';
import { getReadingProgressByLevel } from '../engines/library-books';
import type {
  GppSubtype,
  ReadinessScores,
  SetLog,
  StageProgressState,
  WorkoutKind,
} from '../domain/types';
import type { OperatorMode } from '../engines/operator-mode';
import { buildContextConstraints } from './constraints-builder';
import { EQUIPMENT_ALLOWED, EQUIPMENT_FORBIDDEN } from './prompts/rules/equipment.rules';
import {
  ALL_LOAD_GROUPS,
  type ContextLoadGroup,
} from './context/slice-groups';

export type ContextLookbackDays = 7 | 14 | 30;

const EMPTY_READINESS: ReadinessScores = {
  foundation: 0,
  regulation: 0,
  mind: 0,
  influence: 0,
  global: 0,
};

const EMPTY_OPERATOR_MODE: OperatorMode = {
  mode: 'calculate',
  label: 'CALCULATE',
  rationale: '',
};

const EMPTY_STAGE_PROGRESS: StageProgressState = {
  id: 'progress',
  stageStreaks: {
    foundation: 0,
    regulation: 0,
    mind: 0,
    influence: 0,
  },
  globalStreak: 0,
  lastEvaluatedDate: '',
  qualifyingDays: 0,
  readinessHistory: [],
};

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
  const {
    cognitiveThrottle,
    ops7d: mindOps7d,
    mindDirective: _mindDirective,
    ...mindFact
  } = mind;
  const influence = fullContext.influence as Record<string, unknown>;
  const { throttle, ops7d: influenceOps7d, ...influenceFact } = influence;
  const nutrition = (fullContext.nutrition ?? {}) as Record<string, unknown>;
  const {
    nutritionDirective: _nutritionDirective,
    ops7d: nutritionOps7d,
    ...nutritionFact
  } = nutrition;

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
      nutrition: nutritionFact,
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
      mind: {
        ops7d: mindOps7d,
        cognitiveThrottle,
        mindDirective: _mindDirective,
      },
      influence: { ops7d: influenceOps7d, throttle },
      nutrition: {
        ops7d: nutritionOps7d,
        nutritionDirective: _nutritionDirective,
      },
    },
    hints: {
      constraints: fullContext.constraints,
      aiMode: fullContext.aiMode,
      ruleHints: fullContext.ruleHints,
    },
  };
}

export interface WorkoutContextOptions {
  kind: WorkoutKind;
  gppSubtype?: GppSubtype;
}

/** @deprecated Use buildDirectorContextForTask from ./context/assemble-context */
export async function buildDirectorContext(
  scope?: string,
  lookbackDays: ContextLookbackDays = 7,
  workoutContext?: WorkoutContextOptions
): Promise<string> {
  const { buildDirectorContextForTask } = await import('./context/assemble-context');
  const { resolveScope } = await import('./director-tasks');
  const taskId = scope === 'full' ? 'freeCommand' : 'morningBriefing';
  return buildDirectorContextForTask(taskId, {
    scope: scope ?? resolveScope(taskId),
    lookbackDays,
    workoutContext,
  });
}

export async function buildFlatDirectorContext(
  groups: Set<ContextLoadGroup> = new Set(ALL_LOAD_GROUPS),
  scope?: string,
  lookbackDays: ContextLookbackDays = 7,
  workoutContext?: WorkoutContextOptions
): Promise<Record<string, unknown>> {
  const gl = (name: ContextLoadGroup) => groups.has(name);
  const needsCore =
    gl('kernel') ||
    gl('regulation') ||
    gl('foundation') ||
    gl('mind') ||
    gl('influence') ||
    gl('nutrition') ||
    gl('integration');
  const today = todayKey();
  const yesterday = dateKeyDaysAgo(1);
  const since = sinceForLookback(lookbackDays);

  const profile = needsCore ? await db.operator.toCollection().first() : null;
  const readiness = needsCore ? await getReadiness() : EMPTY_READINESS;
  const hints = gl('kernel') ? await getRuleHints() : [];
  const statuses = needsCore ? getModuleStatuses(readiness) : {};
  const progress =
    gl('kernel') || gl('integration')
      ? await getStageProgress()
      : EMPTY_STAGE_PROGRESS;
  const complianceToday =
    gl('compliance') || gl('kernel') ? await getTodayCompliance(today) : null;

  const missions =
    gl('today') || gl('kernel')
      ? await db.missions.where('date').equals(today).toArray()
      : [];
  const protocol =
    gl('today') || gl('kernel')
      ? await db.protocolItems.where('date').equals(today).toArray()
      : [];
  const dailyLog =
    gl('today') ? await db.dailyLogs.where('date').equals(today).first() : null;

  const acftInWindow = gl('recent')
    ? filterDated(
        await db.acftEvents.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const acftHistory = acftInWindow;
  const lastAcft = acftHistory[0] ?? null;

  const bftHistory = gl('recent') || gl('foundation') || gl('integration')
    ? filterDated(
        await db.bftEvents.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const hrvInWindow = gl('regulation')
    ? filterDated(
        await db.hrvEntries.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const lastHrv = hrvInWindow;

  const hrvTrend = gl('regulation') ? await getHrvTrend(lookbackDays) : null;
  const hrvBaseline = gl('regulation') ? await getHrvBaseline14d() : null;
  const breathing7d = gl('regulation') ? await getBreathing7dSummary() : null;
  const regulationStreak = gl('regulation')
    ? await getRegulationPractice14d()
    : null;
  const stressLogsInWindow = gl('regulation')
    ? filterDated(
        await db.stressLogs.where('date').aboveOrEqual(since).toArray(),
        since
      )
    : [];
  const mindfulInWindow = gl('regulation')
    ? filterDated(
        await db.mindfulnessSessions.where('date').aboveOrEqual(since).toArray(),
        since
      )
    : [];
  const pstRecent = gl('regulation')
    ? filterDated(
        await db.pstEntries.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const trainingSessions = gl('foundation')
    ? filterDated(
        await db.trainingSessions.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const workoutPlansHistory = gl('foundation')
    ? filterDated(
        await db.workoutPlans.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const yesterdayPending =
    gl('today') || gl('compliance')
      ? await db.missions
          .where('date')
          .equals(yesterday)
          .filter((m) => m.status === 'pending')
          .toArray()
      : [];

  const yesterdayReport =
    gl('compliance') || gl('today')
      ? await db.dayReports.where('date').equals(yesterday).first()
      : null;
  const todayReport =
    gl('today') || gl('compliance')
      ? await db.dayReports.where('date').equals(today).first()
      : null;

  const reportsInWindow =
    gl('compliance')
      ? filterDated(
          await db.dayReports.where('date').aboveOrEqual(since).toArray(),
          since
        ).sort((a, b) => a.date.localeCompare(b.date))
      : [];
  const complianceTrend = reportsInWindow.map((r) => ({
    date: r.date,
    compliance: r.compliance,
    debriefDone: r.debriefDone,
  }));

  const streakInfo =
    profile && (gl('kernel') || gl('integration'))
      ? getStreakProgress(progress, profile.currentStage)
      : null;

  const todayQueue = gl('schedule') || gl('kernel') ? await buildTodayQueue(today) : [];
  const weekTemplate = gl('schedule') ? await getWeekTemplate() : { slots: {} };
  const calibration = gl('foundation') ? await getCalibration() : null;
  const workoutPlan =
    gl('foundation') ? await getTodayWorkoutPlan(today) : null;
  const setLogsSummary =
    gl('foundation') ? await buildSetLogsSummary(since) : [];
  const recentSetLogs = gl('foundation')
    ? filterDated(
        await db.setLogs.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const regulationParams = gl('regulation') ? await getRegulationParams() : { pstEfficacy: 0, wimHofTolerance: 0 };
  const regulationDirective = gl('regulation')
    ? await buildRegulationDirective(readiness)
    : null;
  const todayDailyLog =
    gl('regulation') || gl('today')
      ? await db.dailyLogs.where('date').equals(today).first()
      : null;
  const regulationBlock = gl('regulation') ? {
    hrvTrendInWindow: hrvTrend,
    hrvBaseline14d: hrvBaseline,
    hrvZToday: await getHrvZScoreToday(),
    hrvRecent: lastHrv,
    breathing7d,
    resonantMinutes7d: await getResonantMinutes7d(),
    mindfulnessInWindow: mindfulInWindow.length,
    stressLogsInWindow: stressLogsInWindow.length,
    pstEfficacy7d: await getPstEfficacy7d(),
    pstEfficacyEma: regulationParams.pstEfficacy,
    fusionReadiness: await getFusionReadinessSignal(),
    maskBurden7d: await getMaskBurden7d(),
    wimHofTolerance: regulationParams.wimHofTolerance,
    dailyLogToday: todayDailyLog
      ? {
          sleepHours: todayDailyLog.sleepHours,
          stressLevel: todayDailyLog.stressLevel,
        }
      : null,
    regulationStreak,
    pstRecent,
    readinessRegulation: readiness.regulation,
    readinessFoundation: readiness.foundation,
    regulationDirective:
      regulationDirective != null
        ? formatRegulationDirectiveForPrompt(regulationDirective)
        : '',
    constraintKey: 'regulation.wimHof',
  } : {};

  const { getOrCreateDoctrine } = await import('../engines/doctrine-service');
  const { getActiveContactsForContext, getContactsSummary } = await import(
    '../engines/contact-metrics'
  );
  const { getActiveOperations, getOverdueOperations } = await import(
    '../engines/operation-metrics'
  );
  const { getPendingDecisionFollowUps } = await import('../engines/decision-followup');
  const { computeOperatorMode } = await import('../engines/operator-mode');

  const doctrine = gl('doctrine') ? await getOrCreateDoctrine() : { rules: [] };
  const activeContacts = gl('influence') ? await getActiveContactsForContext() : [];
  const contactsSummary = gl('influence') ? await getContactsSummary() : null;
  const activeOps = gl('operations') ? await getActiveOperations() : [];
  const overdueOps = gl('operations') ? await getOverdueOperations() : [];
  const pendingFollowUps = gl('mind')
    ? await getPendingDecisionFollowUps()
    : [];
  const triggerLogsRecent = gl('regulation')
    ? filterDated(
        await db.triggerLogs.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const studyRecent = gl('mind')
    ? filterDated(
        await db.studySessions.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const operatorMode =
    gl('kernel') || needsCore
      ? await computeOperatorMode(readiness)
      : EMPTY_OPERATOR_MODE;

  const mindOps = gl('mind') ? await getMindOpsSummary() : null;
  const mindParams = gl('mind') ? await getMindParams() : null;
  const mindDirective = gl('mind') ? await buildMindDirective(readiness) : null;
  const chessTrend = gl('mind') ? await getChessRatingTrend(lookbackDays) : null;
  const recentScenarios = gl('mind')
    ? filterDated(
        await db.scenarios.where('date').aboveOrEqual(since).toArray(),
        since
      )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6)
        .map((s) => ({
      id: s.id,
      date: s.date,
      title: s.title,
      strengths: s.strengths ? truncateUntrustedText(s.strengths, 120) : undefined,
      weaknesses: s.weaknesses ? truncateUntrustedText(s.weaknesses, 120) : undefined,
      decision: s.decision ? truncateUntrustedText(s.decision, 150) : undefined,
        }))
    : [];
  const recentDecisions = gl('mind')
    ? filterDated(
        await db.decisionLogs.where('date').aboveOrEqual(since).toArray(),
        since
      )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6)
        .map((d) => ({
      id: d.id,
      date: d.date,
      title: d.title,
      choice: truncateUntrustedText(d.choice, 100),
      expectedOutcome: truncateUntrustedText(d.expectedOutcome, 100),
      actualOutcome: d.actualOutcome
        ? truncateUntrustedText(d.actualOutcome, 100)
        : undefined,
      confidence: d.confidence,
      outcomeScore: d.outcomeScore,
        }))
    : [];
  const readingProgress =
    gl('library') || gl('mind') ? await getReadingProgressByLevel() : [];
  const cognitiveThrottle = needsCore ? shouldThrottleCognitiveLoad(readiness) : false;

  const regulationBlockWithTriggers = gl('regulation')
    ? {
        ...regulationBlock,
        triggerLogsInWindow: triggerLogsRecent.slice(0, 8),
      }
    : {};

  const mindBlock = gl('mind') ? {
    chessTrendInWindow: chessTrend,
    ops7d: mindOps,
    mindParams: {
      chessDoseTargetMin: mindParams!.chessDoseTargetMin,
      reflectEfficacy: mindParams!.reflectEfficacy,
      decisionCalibration: mindParams!.decisionCalibration,
      cognitivePeakHour: mindParams!.cognitivePeakHour,
      swotTolerance: mindParams!.swotTolerance,
      ratingEma: mindParams!.ratingEma,
    },
    mindDirective: formatMindDirectiveForPrompt(mindDirective!),
    recentScenarios,
    recentDecisions,
    studySessionsInWindow: studyRecent.slice(0, 8),
    pendingDecisionFollowUps: pendingFollowUps.map((d) => ({
      id: d.id,
      title: d.title,
      followUpDueDate: d.followUpDueDate,
      expectedOutcome: d.expectedOutcome?.slice(0, 100),
    })),
    readingProgress,
    cognitiveThrottle,
    constraintKey: 'mind.cognitiveThrottle',
  } : {};

  const influenceOps = gl('influence') ? await getInfluenceOpsSummary() : null;
  const influenceParams = gl('influence') ? await getInfluenceParams() : null;
  const influenceDirective = gl('influence') ? await buildInfluenceDirective(readiness) : null;
  const recentInfluence = gl('influence')
    ? filterDated(
        await db.influenceEntries.where('date').aboveOrEqual(since).toArray(),
        since
      ).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const influenceThrottle = gl('influence') ? shouldThrottleInfluence(readiness) : false;

  const influenceBlock = gl('influence') ? {
    ops7d: influenceOps,
    influenceParams: {
      miDepthEma: influenceParams!.miDepthEma,
      miEfficacyEma: influenceParams!.miEfficacyEma,
      miDoseTargetWeekly: influenceParams!.miDoseTargetWeekly,
      nudgeEfficacyEma: influenceParams!.nudgeEfficacyEma,
    },
    influenceDirective: formatInfluenceDirectiveForPrompt(influenceDirective!),
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
  } : {};

  const pdp = gl('integration') ? await db.pdp.toCollection().first() : null;
  const nutritionOps = gl('nutrition') ? await getNutritionOpsSummary() : null;
  const nutritionParams = gl('nutrition') ? await getNutritionParams() : null;
  const nutritionDirective = gl('nutrition') ? await buildNutritionDirective(readiness) : null;
  const activeNutritionGoal = gl('nutrition') ? await getActiveGoal() : null;
  const todayNutritionDay = gl('nutrition') ? await getTodayNutritionDay() : null;

  const nutritionBlock = gl('nutrition') ? {
    ops7d: nutritionOps,
    nutritionParams: {
      proteinBaselineEma: nutritionParams!.proteinBaselineEma,
      calorieBaselineEma: nutritionParams!.calorieBaselineEma,
      adherenceEma: nutritionParams!.adherenceEma,
      loggingDoseTargetMeals: nutritionParams!.loggingDoseTargetMeals,
    },
    goal: activeNutritionGoal
      ? {
          goalType: activeNutritionGoal.goalType,
          targetCalories: activeNutritionGoal.targetCalories,
          targetProtein: activeNutritionGoal.targetProtein,
        }
      : null,
    today: todayNutritionDay
      ? {
          calories: todayNutritionDay.calories,
          protein: todayNutritionDay.protein,
          proteinGap: nutritionOps!.proteinGap,
        }
      : null,
    nutritionDirective: formatNutritionDirectiveForPrompt(nutritionDirective!),
    constraintKey: 'nutrition.adherence',
  } : {};

  const integrationBundle = gl('integration')
    ? await buildIntegrationContextBundle(readiness)
    : null;
  const integrationOps = integrationBundle?.ops ?? null;
  const integrationParams = gl('integration') ? await getIntegrationParams() : null;
  const lastWeeklyAudit = gl('integration') ? await getLastWeeklyAudit() : null;
  const integrationDirective =
    gl('integration') && profile != null && integrationOps
      ? await buildIntegrationDirective({
          readiness,
          ops: integrationOps,
          profile,
          progress: integrationBundle!.progress,
          pdp: pdp ?? null,
          gateEval: integrationBundle!.progress.lastGateSnapshot ?? null,
        })
      : null;

  const integrationBlock = gl('integration') ? {
    stages: getPyramidStageScores(readiness),
    synergy: getSynergySummary(readiness),
    ops7d: integrationOps,
    integrationParams: {
      complianceTargetEma: integrationParams!.complianceTargetEma,
      debriefTargetEma: integrationParams!.debriefTargetEma,
      synergyGapTolerance: integrationParams!.synergyGapTolerance,
      auditIntervalDaysEma: integrationParams!.auditIntervalDaysEma,
    },
    integrationDirective: integrationDirective
      ? formatIntegrationDirectiveForPrompt(integrationDirective)
      : null,
    pdp: pdp ?? null,
    lastWeeklyAudit: lastWeeklyAudit
      ? { createdAt: lastWeeklyAudit.createdAt, preview: lastWeeklyAudit.text.slice(0, 200) }
      : null,
    constraintKey: 'integration.weekly',
  } : {};

  const fitnessLevels = gl('foundation')
    ? await getFitnessLevels()
    : DEFAULT_FITNESS_LEVELS;
  const gppRotationNext = gl('foundation') ? await getRecommendedGppSubtype() : null;
  const workoutStats: Record<string, { totalCount: number; lastDate: string | null }> = {};
  const kinds: WorkoutKind[] = gl('foundation') ? [
    'hift',
    'gpp_push',
    'gpp_pull',
    'gpp_core',
    'gpp_legs',
    'warmup',
    'stretch',
    'cardio_intense',
    'cardio_easy',
  ] : [];
  for (const k of kinds) {
    const s = await getWorkoutTypeStat(k);
    workoutStats[k] = { totalCount: s.totalCount, lastDate: s.lastDate };
  }

  const activeKind = workoutContext?.kind ?? 'legacy';
  const activeTier = tierForWorkoutKind(fitnessLevels, activeKind);
  const allowedForActive = gl('foundation')
    ? activeKind === 'legacy'
      ? BAR_EXERCISES.map((e) => e.id)
      : getAllowedIdsForKind(activeKind, activeTier)
    : [];

  const setLogsByKind: Record<string, typeof recentSetLogs> = {};
  for (const k of kinds) {
    setLogsByKind[k] = recentSetLogs.filter((l) => l.workoutKind === k);
  }

  const cardioSessionsInWindow = gl('foundation')
    ? filterDated(
        await db.cardioSessions.where('date').aboveOrEqual(since).toArray(),
        since
      )
    : [];

  const { getTrainingParams } = await import('../engines/training-params');
  const { getFoundationLoadModifiers } = await import('../engines/foundation-load');
  const trainingParams = gl('foundation') ? await getTrainingParams() : null;
  const loadModifiers = gl('foundation') ? await getFoundationLoadModifiers() : null;

  const foundationBlock = gl('foundation') ? {
    fitnessLevels: {
      hift: fitnessLevels.hift,
      gpp: fitnessLevels.gpp,
      warmup: fitnessLevels.warmup,
      stretch: fitnessLevels.stretch,
      manualOverride: fitnessLevels.manualOverride,
    },
    trainingParams: {
      strengthPull: trainingParams!.strengthPull,
      strengthPush: trainingParams!.strengthPush,
      fatigue: trainingParams!.fatigue,
      recoveryPrior: trainingParams!.recoveryPrior,
    },
    loadModifiers,
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
  } : {};

  const constraints = needsCore
    ? buildContextConstraints(readiness, operatorMode, {
    cognitiveThrottle,
    influenceThrottle,
      })
    : { active: [], flags: {}, aiMode: 'focus' as const, aiModeHints: [] };

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
    nutrition: nutritionBlock,
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

  return fullContext as unknown as Record<string, unknown>;
}
