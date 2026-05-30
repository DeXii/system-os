import { db, dateKeyDaysAgo, todayKey } from '../db';
import { getOrCreateDayReport, refreshDayReportCompliance } from './command-compliance';
import { setSucceeded } from './progression-engine';
import {
  getBreathing7dSummary,
  getDailyContextPenalty,
  getHrvTrendScore,
  getMaskBurdenPenalty,
  getPstReadinessBonus,
  getSubjectiveReadinessBonus,
  hadWimHofToday,
} from './regulation-metrics';
import { REGULATION_THRESHOLDS as RT } from './regulation-thresholds';
import type { ReadinessScores } from '../domain/types';

const WEIGHTS = { foundation: 0.4, regulation: 0.25, mind: 0.2, influence: 0.15 };
const COLD_START = 50;
const COLD_LOOKBACK_DAYS = 14;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function hasTrainingSince(since: string): Promise<boolean> {
  return (await db.trainingSessions.where('date').aboveOrEqual(since).count()) > 0;
}
async function hasAcftSince(since: string): Promise<boolean> {
  const acft = (await db.acftEvents.where('date').aboveOrEqual(since).count()) > 0;
  const bft = (await db.bftEvents.where('date').aboveOrEqual(since).count()) > 0;
  return acft || bft;
}
async function hasSetLogsSince(since: string): Promise<boolean> {
  return (await db.setLogs.where('date').aboveOrEqual(since).count()) > 0;
}
async function hasDailyLogSince(since: string): Promise<boolean> {
  return (await db.dailyLogs.where('date').aboveOrEqual(since).count()) > 0;
}
async function hasHrvSince(since: string): Promise<boolean> {
  return (await db.hrvEntries.where('date').aboveOrEqual(since).count()) > 0;
}
async function hasBreathSince(since: string): Promise<boolean> {
  return (await db.breathingSessions.where('date').aboveOrEqual(since).count()) > 0;
}
async function hasMindfulSince(since: string): Promise<boolean> {
  return (await db.mindfulnessSessions.where('date').aboveOrEqual(since).count()) > 0;
}

async function isColdStart(checks: (() => Promise<boolean>)[]): Promise<boolean> {
  const results = await Promise.all(checks.map((c) => c()));
  return !results.some(Boolean);
}

async function foundationScore(): Promise<number> {
  const since = dateKeyDaysAgo(7);
  const sinceCold = dateKeyDaysAgo(COLD_LOOKBACK_DAYS);

  const cold = await isColdStart([
    () => hasTrainingSince(sinceCold),
    () => hasAcftSince(sinceCold),
    () => hasSetLogsSince(sinceCold),
    () => hasDailyLogSince(sinceCold),
  ]);
  if (cold) return COLD_START;

  const sessions = await db.trainingSessions.where('date').aboveOrEqual(since).count();
  const setLogDays = new Set(
    (await db.setLogs.where('date').aboveOrEqual(since).toArray()).map((l) => l.date)
  ).size;
  const acft = await db.acftEvents.orderBy('date').reverse().first();
  const bft = await db.bftEvents.orderBy('date').reverse().first();
  const logs = await db.dailyLogs.where('date').aboveOrEqual(since).toArray();

  const barSessions = Math.max(sessions, setLogDays);
  const trainingScore = Math.min(35, (barSessions / 3) * 35);

  const since14 = dateKeyDaysAgo(13);
  const recentLogs = await db.setLogs.where('date').aboveOrEqual(since14).toArray();
  const progressed = new Set(
    recentLogs.filter((l) => setSucceeded(l)).map((l) => l.exerciseId)
  );
  const progressionScore = Math.min(15, progressed.size * 3);

  let testScore = 0;
  const test = bft ?? acft;
  if (test) {
    testScore = 20;
    const daysSince = Math.floor(
      (Date.now() - new Date(test.date).getTime()) / (86400000)
    );
    if (daysSince < 90) testScore += 15;
  }

  const recoveryDays = logs.filter(
    (l) =>
      (l.sleepHours ?? 0) >= 7 && l.nutritionOk !== false && l.hydrationOk !== false
  ).length;
  const recoveryScore = Math.min(35, recoveryDays * 5);

  return clamp(trainingScore + progressionScore + testScore + recoveryScore);
}

async function regulationScore(): Promise<number> {
  const since = dateKeyDaysAgo(7);
  const sinceCold = dateKeyDaysAgo(COLD_LOOKBACK_DAYS);

  const cold = await isColdStart([
    () => hasHrvSince(sinceCold),
    () => hasBreathSince(sinceCold),
    () => hasMindfulSince(sinceCold),
  ]);
  if (cold) return COLD_START;

  const hrv = await db.hrvEntries.where('date').aboveOrEqual(since).count();
  const breathSummary = await getBreathing7dSummary();
  const mindful = await db.mindfulnessSessions.where('date').aboveOrEqual(since).count();
  const stressLogs = await db.stressLogs.where('date').aboveOrEqual(since).count();
  const trendBonus = await getHrvTrendScore();

  const hrvScore = Math.min(35, (hrv / 5) * 35);
  const resonantScore = Math.min(20, (breathSummary.resonant / 4) * 20);
  const wimScore = Math.min(10, (breathSummary.wimHof / 2) * 10);
  const mindfulScore = Math.min(20, (mindful / 3) * 20);
  const stressScore = Math.min(10, stressLogs >= 1 ? 10 : 0);

  const subjectiveBonus = await getSubjectiveReadinessBonus();
  const pstBonus = await getPstReadinessBonus();
  const contextPenalty = await getDailyContextPenalty();
  const maskPenalty = await getMaskBurdenPenalty();

  let total =
    hrvScore +
    resonantScore +
    wimScore +
    mindfulScore +
    stressScore +
    trendBonus +
    subjectiveBonus +
    pstBonus -
    contextPenalty -
    maskPenalty;

  if (
    breathSummary.wimHof >= RT.wimHofOveruse7d &&
    breathSummary.resonant < RT.resonantMinWithWim7d
  ) {
    total -= RT.wimHofOverusePenalty;
  }
  if (await hadWimHofToday()) {
    const hrvToday = await db.hrvEntries.where('date').equals(todayKey()).first();
    if (hrvToday?.rmssd != null && hrvToday.rmssd < RT.wimHofLowRmssd) {
      total -= RT.wimHofLowHrvPenalty;
    }
  }

  return clamp(total);
}

async function mindScore(): Promise<number> {
  const foundation = await foundationScore();
  const regulation = await regulationScore();
  const { computeMindScore } = await import('./mind-readiness');
  return computeMindScore(foundation, regulation);
}

async function influenceScore(): Promise<number> {
  const { computeInfluenceScore } = await import('./influence-readiness');
  return computeInfluenceScore();
}

export async function getReadiness(): Promise<ReadinessScores> {
  const { getReadinessCached } = await import('../cache/readiness-cache');
  return getReadinessCached();
}

export async function computeReadiness(): Promise<ReadinessScores> {
  const profile = await db.operator.toCollection().first();
  const [f0, r0, m0, i0] = await Promise.all([
    foundationScore(),
    regulationScore(),
    mindScore(),
    influenceScore(),
  ]);

  let foundation = f0;
  let regulation = r0;
  let mind = m0;
  let influence = i0;

  if (profile) {
    const report = await db.dayReports.where('date').equals(todayKey()).first();
    if (report?.stageAdjustment) {
      const stage = profile.currentStage;
      if (stage === 'foundation') foundation = clamp(foundation + report.stageAdjustment);
      if (stage === 'regulation') regulation = clamp(regulation + report.stageAdjustment);
      if (stage === 'mind') mind = clamp(mind + report.stageAdjustment);
      if (stage === 'influence') influence = clamp(influence + report.stageAdjustment);
    }
  }

  let global = clamp(
    foundation * WEIGHTS.foundation +
      regulation * WEIGHTS.regulation +
      mind * WEIGHTS.mind +
      influence * WEIGHTS.influence
  );

  if (foundation < 45 || regulation < 40) {
    global = Math.min(global, Math.max(foundation, regulation) + 15);
  }

  return { foundation, regulation, mind, influence, global };
}

export async function getRuleHints(): Promise<string[]> {
  const hints: string[] = [];
  const today = todayKey();
  for (let d = 0; d < 7; d++) {
    await refreshDayReportCompliance(dateKeyDaysAgo(d));
  }
  const readiness = await getReadiness();
  const profile = await db.operator.toCollection().first();

  const hrvToday = await db.hrvEntries.where('date').equals(today).count();
  if (hrvToday === 0) {
    const recent = await db.hrvEntries.orderBy('date').reverse().limit(3).toArray();
    if (recent.length === 0) {
      hints.push('3+ дня без записи HRV — приоритет REGULATION');
    } else {
      const d = dateKeyDaysAgo(3);
      if (!recent.some((r) => r.date >= d)) {
        hints.push('3+ дня без записи HRV — приоритет REGULATION');
      }
    }
  }

  if (readiness.foundation < 45) {
    hints.push('Низкий readiness FOUNDATION — не увеличивать когнитивную/социальную нагрузку');
  }
  if (readiness.regulation < 40) {
    hints.push('Слабая саморегуляция — резонансное дыхание LIVE 10 мин сегодня');
  }
  const breath7 = await getBreathing7dSummary();
  if (breath7.wimHof >= 3 && breath7.resonant < 2) {
    hints.push('Много Wim Hof при малом резонансе — приоритет восстановительному дыханию');
  }
  if (hrvToday === 0) {
    const lastHrv = await db.hrvEntries.orderBy('date').reverse().first();
    if (lastHrv) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastHrv.date).getTime()) / 86400000
      );
      if (daysSince >= 2) {
        hints.push('HRV stale — утренний check-in в REGULATION');
      }
    }
  }
  if (readiness.mind < 40 && profile) {
    hints.push('MIND degraded — приоритет FOUNDATION/REGULATION');
  }
  const chessToday = await db.chessGoSessions.where('date').equals(today).count();
  if (chessToday === 0) {
    const recentChess = await db.chessGoSessions.orderBy('date').reverse().first();
    if (recentChess) {
      const daysSince = Math.floor(
        (Date.now() - new Date(recentChess.date).getTime()) / 86400000
      );
      if (daysSince >= 2) hints.push('Chess/Go stale — журнал сессии в MIND');
    }
  }
  const reflectToday = await db.reflections.where('date').equals(today).count();
  if (reflectToday === 0) {
    hints.push('Короткий PMR/OODA вечером — слот mind.reflect.short');
  }
  const { shouldThrottleCognitiveLoad } = await import('./mind-metrics');
  if (shouldThrottleCognitiveLoad(readiness)) {
    hints.push('Низкий foundation/regulation — лёгкая когнитивка, без тяжёлых SWOT');
  }
  if (readiness.influence < 40 && profile) {
    hints.push('INFLUENCE degraded — укрепите фундамент перед социальной тактикой');
  }

  const bft = await db.bftEvents.orderBy('date').reverse().first();
  const acft = await db.acftEvents.orderBy('date').reverse().first();
  const test = bft ?? acft;
  if (!test) {
    hints.push('Нет Bar Fitness Test — пройти оценку в FOUNDATION');
  } else {
    const daysSince = Math.floor(
      (Date.now() - new Date(test.date).getTime()) / 86400000
    );
    if (daysSince > 90) {
      hints.push('BFT stale > 90 дней — повторный тест в FOUNDATION');
    }
  }

  const yesterday = dateKeyDaysAgo(1);
  const yReport = await db.dayReports.where('date').equals(yesterday).first();
  if (yReport && !yReport.debriefDone) {
    hints.push('Вечерний debrief вчера не выполнен — обязателен для прогресса');
  }

  const progress = await db.stageProgress.get('progress');
  if (profile && progress) {
    const gate = progress.lastGateSnapshot;
    if (gate && !gate.eligible) {
      const failed = gate.criteria.filter((c) => !c.met && c.severity === 'blocker');
      if (failed.length > 0) {
        hints.push(`Gate перехода: не выполнено — ${failed.map((c) => c.label).join(', ')}`);
      }
      if (gate.softScore < 80) {
        hints.push(`Gate soft score: ${gate.softScore}% (нужно ≥80%)`);
      }
      if (gate.qualifyingDays < gate.qualifyingRequired) {
        hints.push(
          `Qualifying days: ${gate.qualifyingDays}/${gate.qualifyingRequired} для перехода`
        );
      }
    }
    if (progress.pendingAdvance) {
      hints.push(`Ожидает подтверждения перехода на ${progress.pendingAdvance}`);
    }
    if (progress.pendingDemotion) {
      hints.push(`Риск отката: рекомендуется этап ${progress.pendingDemotion}`);
    }
  }

  const missionsPending = await db.missions
    .where('date')
    .equals(today)
    .filter((m) => m.status === 'pending')
    .count();
  if (missionsPending > 8) {
    hints.push(`${missionsPending} невыполненных миссий — сфокусироваться на critical`);
  }

  const todayReport = await getOrCreateDayReport(today);
  if (!todayReport.briefingDone) {
    hints.push('Утренний briefing DIRECTOR ещё не выполнен');
  }

  const { getPendingDecisionFollowUps, getDecisionClosureRate14d } = await import(
    './decision-followup'
  );
  const closurePct = await getDecisionClosureRate14d();
  if (closurePct < 40) {
    hints.push(
      `Decision closure 14d=${closurePct}% < 40% — приоритет mind.decision.followup`
    );
  }
  const pendingDecisions = await getPendingDecisionFollowUps();
  if (pendingDecisions.length > 0) {
    hints.push(
      `Просрочен проверка исхода решения: ${pendingDecisions[0].title.slice(0, 40)}`
    );
  }

  const { getOverdueOperations } = await import('./operation-metrics');
  const overdueOps = await getOverdueOperations();
  if (overdueOps.length > 0) {
    hints.push(`Операция просрочена: ${overdueOps[0].title.slice(0, 40)}`);
  }

  const { getContactsSummary } = await import('./contact-metrics');
  const contactsSummary = await getContactsSummary();
  if (contactsSummary.needingDebrief.length > 0) {
    hints.push(
      `Debrief по контакту: ${contactsSummary.needingDebrief[0].codename}`
    );
  }

  const studySince = dateKeyDaysAgo(4);
  const studyCount = await db.studySessions.where('date').aboveOrEqual(studySince).count();
  if (studyCount === 0 && profile && profile.unlockedStages.includes('mind')) {
    hints.push('5+ дней без учёбы — слот mind.study');
  }

  const { isDoctrineEmpty } = await import('./doctrine-service');
  if (await isDoctrineEmpty()) {
    hints.push('Доктрина оператора не задана — INTEGRATION → Doctrine');
  }

  const reports7 = await db.dayReports
    .where('date')
    .aboveOrEqual(dateKeyDaysAgo(6))
    .toArray();
  const lowComplianceDays = reports7.filter((r) => r.compliance < 60).length;
  if (lowComplianceDays >= 3) {
    hints.push('Compliance < 60% три дня подряд — вечерний debrief обязателен');
  }

  return hints;
}
