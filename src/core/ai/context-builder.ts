import { BAR_EXERCISES } from '@/content/exercises-bars';
import { db, dateKeyDaysAgo, todayKey } from '../db';
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
import type { SetLog } from '../domain/types';

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

export async function buildDirectorContext(scope?: string): Promise<string> {
  const today = todayKey();
  const yesterday = dateKeyDaysAgo(1);
  const since14 = dateKeyDaysAgo(13);
  const profile = await db.operator.toCollection().first();
  const readiness = await computeReadiness();
  const hints = await getRuleHints();
  const statuses = getModuleStatuses(readiness);
  const progress = await getStageProgress();
  const complianceToday = await getTodayCompliance(today);

  const missions = await db.missions.where('date').equals(today).toArray();
  const protocol = await db.protocolItems.where('date').equals(today).toArray();
  const dailyLog = await db.dailyLogs.where('date').equals(today).first();
  const lastAcft = await db.acftEvents.orderBy('date').reverse().first();
  const acftHistory = await db.acftEvents.orderBy('date').reverse().limit(3).toArray();
  const bftHistory = await db.bftEvents.orderBy('date').reverse().limit(5).toArray();
  const since7 = dateKeyDaysAgo(6);
  const lastHrv = await db.hrvEntries.orderBy('date').reverse().limit(7).toArray();
  const hrvTrend = await getHrvTrend(14);
  const hrvBaseline = await getHrvBaseline14d();
  const breathing7d = await getBreathing7dSummary();
  const regulationStreak = await getRegulationStreak();
  const stressLogs7d = await db.stressLogs.where('date').aboveOrEqual(since7).toArray();
  const mindful7d = await db.mindfulnessSessions.where('date').aboveOrEqual(since7).toArray();
  const pstRecent = await db.pstEntries.orderBy('date').reverse().limit(5).toArray();
  const trainingSessions = await db.trainingSessions
    .where('date')
    .aboveOrEqual(since14)
    .toArray();
  const workoutPlansHistory = await db.workoutPlans
    .where('date')
    .aboveOrEqual(dateKeyDaysAgo(6))
    .toArray();

  const yesterdayPending = await db.missions
    .where('date')
    .equals(yesterday)
    .filter((m) => m.status === 'pending')
    .toArray();

  const yesterdayReport = await db.dayReports.where('date').equals(yesterday).first();
  const todayReport = await db.dayReports.where('date').equals(today).first();

  const weekReports = await db.dayReports.where('date').aboveOrEqual(since7).toArray();
  const complianceTrend = weekReports.map((r) => ({
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
  const setLogsSummary = await buildSetLogsSummary(since14);
  const recentSetLogs = await db.setLogs.orderBy('date').reverse().limit(30).toArray();

  const regulationBlock = {
    hrvTrend14d: hrvTrend,
    hrvBaseline14d: hrvBaseline,
    hrvRecent: lastHrv,
    breathing7d,
    mindfulness7d: mindful7d.length,
    stressLogs7d: stressLogs7d.length,
    regulationStreak,
    pstRecent,
    readinessRegulation: readiness.regulation,
    readinessFoundation: readiness.foundation,
    rule: 'Не назначать Wim Hof при низком foundation (<45) или regulation (<40) или RMSSD ниже baseline',
  };

  const mindOps = await getMindOpsSummary();
  const chessTrend = await getChessRatingTrend(30);
  const recentScenarios = await db.scenarios.orderBy('date').reverse().limit(3).toArray();
  const recentDecisions = await db.decisionLogs.orderBy('date').reverse().limit(3).toArray();
  const readingProgress = await getReadingProgressByLevel();
  const cognitiveThrottle = shouldThrottleCognitiveLoad(readiness);

  const mindBlock = {
    chessTrend30d: chessTrend,
    ops7d: mindOps,
    recentScenarios,
    recentDecisions,
    readingProgress,
    cognitiveThrottle,
    rule: 'При cognitiveThrottle не назначать тяжёлые SWOT/длинные сценарии. SWOT review — дополни S/W/O/T критически.',
  };

  const influenceOps = await getInfluenceOpsSummary();
  const recentInfluence = await db.influenceEntries
    .orderBy('date')
    .reverse()
    .limit(5)
    .toArray();
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

  const foundationBlock = {
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
    trainingSessionsLast14d: trainingSessions,
    workoutPlansLast7d: workoutPlansHistory.map((p) => ({
      date: p.date,
      status: p.status,
      exerciseCount: p.exercises.length,
      notes: p.notes,
    })),
    allowedExerciseIds: BAR_EXERCISES.map((e) => e.id),
    exerciseCatalog: BAR_EXERCISES.map((e) => ({
      id: e.id,
      name: e.name,
      pattern: e.pattern,
      equipment: e.equipment,
    })),
  };

  const fullContext = {
    date: today,
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
      todayQueue: todayQueue.map((s) => ({
        rank: s.rank,
        title: s.title,
        type: s.type,
        taskKey: s.taskKey,
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
      trend7d: complianceTrend,
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
      acft: lastAcft ?? null,
      bft: bftHistory[0] ?? null,
      hrv: lastHrv,
      training: trainingSessions.slice(0, 5),
    },
  };

  const effectiveScope = scope ?? 'full';
  if (
    effectiveScope === 'full' ||
    effectiveScope === 'director' ||
    effectiveScope === 'archive' ||
    effectiveScope === 'command'
  ) {
    return JSON.stringify(fullContext, null, 2);
  }

  const scoped: Record<string, unknown> = {
    date: fullContext.date,
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

  switch (effectiveScope) {
    case 'foundation':
      scoped.foundation = fullContext.foundation;
      break;
    case 'regulation':
      scoped.regulation = fullContext.regulation;
      scoped.foundation = {
        readinessFoundation: fullContext.regulation.readinessFoundation,
        equipmentConstraints: fullContext.foundation.equipmentConstraints,
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
      scoped.mind = { readingProgress: fullContext.mind.readingProgress };
      break;
    case 'integration':
      scoped.integration = fullContext.integration;
      scoped.foundation = { bftHistory: fullContext.foundation.bftHistory };
      scoped.regulation = { hrvTrend14d: fullContext.regulation.hrvTrend14d };
      scoped.mind = { ops7d: fullContext.mind.ops7d };
      scoped.influence = { ops7d: fullContext.influence.ops7d };
      break;
    default:
      break;
  }

  return JSON.stringify(scoped, null, 2);
}
