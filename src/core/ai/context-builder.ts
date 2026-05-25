import { getAllowedIdsForKind, getExercisesForKind } from '@/content/exercises';
import { getAllReferenceTemplatesForGroq } from '@/content/exercises/local-workout-templates';
import { BAR_EXERCISES } from '@/content/exercises-bars';
import { db, dateKeyDaysAgo, todayKey } from '../db';
import { getFitnessLevels, tierForWorkoutKind } from '../engines/progression-engine';
import { getRecommendedGppSubtype, getWorkoutTypeStat } from '../engines/workout-stats';
import { getTodayCompliance } from '../engines/command-compliance';
import { computeReadiness, getRuleHints } from '../engines/readiness';
import { getModuleStatuses } from '../engines/stage-gates';
import { getStageProgress, getStreakProgress } from '../engines/stage-progression';
import { buildTodayQueue, getWeekTemplate } from '../engines/week-schedule';
import { getCalibration, getTodayWorkoutPlan } from '../engines/workout-planner';
import {
  getBreathing7dSummary,
  getHrvBaseline14d,
  getHrvTrend,
  getRegulationStreak,
} from '../engines/regulation-metrics';
import {
  getChessRatingTrend,
  getMindOpsSummary,
  shouldThrottleCognitiveLoad,
} from '../engines/mind-metrics';
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

function selectContextPayload(
  fullContext: Record<string, unknown>,
  effectiveScope: string
): Record<string, unknown> {
  if (
    effectiveScope === 'full' ||
    effectiveScope === 'director' ||
    effectiveScope === 'archive'
  ) {
    return { ...fullContext, scope: effectiveScope };
  }

  const scoped: Record<string, unknown> = {
    date: fullContext.date,
    contextLookbackDays: fullContext.contextLookbackDays,
    scope: effectiveScope,
    operator: fullContext.operator,
    schedule: fullContext.schedule,
    readiness: fullContext.readiness,
    moduleStatuses: fullContext.moduleStatuses,
    ruleHints: fullContext.ruleHints,
    stageProgress: fullContext.stageProgress,
    compliance: fullContext.compliance,
    yesterdayPendingMissions: fullContext.yesterdayPendingMissions,
    today: fullContext.today,
    recent: fullContext.recent,
    readingProgress: fullContext.readingProgress,
  };

  const foundation = fullContext.foundation as Record<string, unknown>;
  const regulation = fullContext.regulation as Record<string, unknown>;

  switch (effectiveScope) {
    case 'command':
      scoped.foundation = {
        equipmentConstraints: foundation.equipmentConstraints,
        workoutPlanToday: foundation.workoutPlanToday,
        setLogsSummary: foundation.setLogsSummary,
        allowedExerciseIds: foundation.allowedExerciseIds,
        readinessFoundation: regulation.readinessFoundation,
      };
      scoped.regulation = {
        hrvTrendInWindow: regulation.hrvTrendInWindow,
        readinessRegulation: regulation.readinessRegulation,
        readinessFoundation: regulation.readinessFoundation,
        hrvRecent: regulation.hrvRecent,
        breathing7d: regulation.breathing7d,
      };
      break;
    case 'foundation':
      scoped.foundation = omitExerciseCatalog(foundation, effectiveScope);
      break;
    case 'regulation':
      scoped.regulation = fullContext.regulation;
      scoped.foundation = {
        readinessFoundation: regulation.readinessFoundation,
        equipmentConstraints: foundation.equipmentConstraints,
      };
      break;
    case 'mind':
      scoped.mind = fullContext.mind;
      break;
    case 'influence':
      scoped.influence = fullContext.influence;
      break;
    case 'library':
      scoped.readingProgress = fullContext.readingProgress;
      scoped.mind = { readingProgress: (fullContext.mind as Record<string, unknown>).readingProgress };
      break;
    case 'integration':
      scoped.integration = fullContext.integration;
      scoped.foundation = { bftHistory: foundation.bftHistory };
      scoped.regulation = { hrvTrendInWindow: regulation.hrvTrendInWindow };
      scoped.mind = { ops7d: (fullContext.mind as Record<string, unknown>).ops7d };
      scoped.influence = { ops7d: (fullContext.influence as Record<string, unknown>).ops7d };
      break;
    default:
      break;
  }

  if (scoped.foundation && typeof scoped.foundation === 'object') {
    scoped.foundation = omitExerciseCatalog(
      scoped.foundation as Record<string, unknown>,
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
  const today = todayKey();
  const yesterday = dateKeyDaysAgo(1);
  const since = sinceForLookback(lookbackDays);

  const profile = await db.operator.toCollection().first();
  const readiness = await computeReadiness();
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
  const regulationStreak = await getRegulationStreak();
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
    rule: 'Не назначать Wim Hof при низком foundation (<45) или regulation (<40) или RMSSD ниже baseline',
  };

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

  const mindBlock = {
    chessTrendInWindow: chessTrend,
    ops7d: mindOps,
    recentScenarios,
    recentDecisions,
    readingProgress,
    cognitiveThrottle,
    rule: 'При cognitiveThrottle не назначать тяжёлые SWOT/длинные сценарии. SWOT review — дополни S/W/O/T критически.',
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
    rule: 'При throttle — только Influence Protocol + короткое observation, без сложных nudge-цепочек.',
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
    rule: 'Воскресенье — приоритет integration.weekly_audit; bottleneck определяет фокус недели.',
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
      allowed: ['pull-up bar', 'parallel bars', 'bodyweight only'],
      forbidden: [
        'barbell',
        'dumbbells',
        'gym machines',
        'squat rack',
        'kettlebell',
        'leg press',
        'cable machine',
      ],
      note:
        'Оператор тренируется без зала. HIFT = круговая на турнике/брусьях и с весом тела. НЕ предлагать штангу и тренажёры.',
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
      notes: p.notes,
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
    calibrationRule:
      'Подбирай нагрузку на грани возможностей: 70–90% выполнения целей. Макс 4 подхода. Анализируй setLogsByKind за 7 дней.',
    referenceWorkoutTemplates: {
      tierLabel: 'Начинающий (эталон структуры)',
      ...getAllReferenceTemplatesForGroq(),
    },
  };

  const fullContext = {
    date: today,
    contextLookbackDays: lookbackDays,
    contextSinceDate: since,
    scope: scope ?? 'full',
    operator: profile
      ? {
          codename: profile.codename,
          goals: profile.goals,
          currentStage: profile.currentStage,
          unlockedStages: profile.unlockedStages,
          startDate: profile.startDate,
          ethicsAccepted: profile.ethicsAccepted,
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
    regulation: regulationBlock,
    mind: mindBlock,
    influence: influenceBlock,
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
      dailyLog: dailyLog ?? null,
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
  const payload = selectContextPayload(
    fullContext as unknown as Record<string, unknown>,
    effectiveScope
  );
  return JSON.stringify(payload);
}
