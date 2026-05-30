import { db, dateKeyDaysAgo, todayKey } from '../db';
import { buildContextConstraints } from '../ai/constraints-builder';
import type { BreathingSession, HrvEntry, OperatorProfile, ReadinessScores } from '../domain/types';
import { getRegulationParams } from './regulation-params';
import { REGULATION_THRESHOLDS as T } from './regulation-thresholds';

export interface HrvTrendPoint {
  date: string;
  rmssd: number;
}

export interface RegulationDirective {
  calculationLine: string;
  actionLine: string;
  denyLine?: string;
}

export type BreathProtocolChoice = 'resonant' | 'wimhof';

export interface RegulationOpsSummary {
  regulationScore: number;
  hrv7: number;
  breath: { resonant: number; wimHof: number; total: number };
  mindful7: number;
  stress7: number;
  practice14d: number;
  comboStreak: number;
  baseline: number | null;
  hrvZToday: number | null;
  subjectiveToday: number | null;
  pstEfficacy: number;
  maskBurden7d: number | null;
  resonantMin7d: number;
  wimHofTolerance: number;
}

export function getHrvBaseline(entries: HrvEntry[]): number | null {
  const withRmssd = entries.filter((e) => e.rmssd != null && e.rmssd > 0);
  if (withRmssd.length < 3) return null;
  const sum = withRmssd.reduce((a, e) => a + (e.rmssd ?? 0), 0);
  return Math.round(sum / withRmssd.length);
}

export async function getHrvTrend(days = 14): Promise<HrvTrendPoint[]> {
  const since = dateKeyDaysAgo(days - 1);
  const entries = await db.hrvEntries.where('date').aboveOrEqual(since).toArray();
  return entries
    .filter((e) => e.rmssd != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, rmssd: e.rmssd! }));
}

export async function getHrvBaseline14d(): Promise<number | null> {
  const since = dateKeyDaysAgo(13);
  const entries = await db.hrvEntries.where('date').aboveOrEqual(since).toArray();
  return getHrvBaseline(entries);
}

export async function getHrvZScoreForRmssd(rmssd: number): Promise<number | null> {
  const p = await getRegulationParams();
  if (p.hrvBaselineEma <= 0) return null;
  const sigma = Math.sqrt(Math.max(p.hrvSigmaEma, 25));
  if (sigma < 3) return null;
  return (rmssd - p.hrvBaselineEma) / sigma;
}

export async function getHrvZScoreToday(): Promise<number | null> {
  const today = await db.hrvEntries.where('date').equals(todayKey()).first();
  if (today?.rmssd == null) return null;
  return getHrvZScoreForRmssd(today.rmssd);
}

/** @deprecated Use async isHrvBelowBaseline — kept for sync chart hints. */
export function isHrvBelowBaselineSync(entry: HrvEntry, baseline: number | null): boolean {
  if (!baseline || entry.rmssd == null) return false;
  return entry.rmssd < baseline * T.baselineRatio;
}

export async function isHrvBelowBaseline(entry: HrvEntry): Promise<boolean> {
  if (entry.rmssd == null) return false;
  const z = await getHrvZScoreForRmssd(entry.rmssd);
  if (z != null) return z < T.hrvZBelow;
  const baseline = await getHrvBaseline14d();
  return baseline != null && isHrvBelowBaselineSync(entry, baseline);
}

export async function getFusionReadinessSignal(): Promise<number | null> {
  const today = await db.hrvEntries.where('date').equals(todayKey()).first();
  if (today?.rmssd == null || today.subjectiveReadiness == null) return null;
  const z = await getHrvZScoreForRmssd(today.rmssd);
  if (z == null) return null;
  const subj = today.subjectiveReadiness / 10 - 0.5;
  return T.subjectiveFusionWeightHrv * z + T.subjectiveFusionWeightSubj * subj;
}

export async function getPstEfficacy7d(): Promise<number | null> {
  const since = dateKeyDaysAgo(6);
  const logs = await db.stressLogs.where('date').aboveOrEqual(since).toArray();
  const withArousal = logs.filter(
    (l) =>
      l.arousalBefore != null &&
      l.arousalAfter != null &&
      l.arousalBefore >= l.arousalAfter
  );
  if (!withArousal.length) return null;
  const mean =
    withArousal.reduce((a, l) => a + (l.arousalBefore! - l.arousalAfter!), 0) /
    withArousal.length;
  return mean;
}

export async function getMaskBurden7d(): Promise<number | null> {
  const since = dateKeyDaysAgo(6);
  const logs = await db.triggerLogs.where('date').aboveOrEqual(since).toArray();
  if (!logs.length) return null;
  return logs.reduce((a, l) => a + l.maskScore, 0) / logs.length;
}

export async function getResonantMinutes7d(): Promise<number> {
  const since = dateKeyDaysAgo(6);
  const sessions = await db.breathingSessions.where('date').aboveOrEqual(since).toArray();
  return sessions
    .filter((s) => s.mode === 'resonant')
    .reduce((a, s) => a + s.durationMin, 0);
}

export async function getDailyContextPenalty(): Promise<number> {
  const log = await db.dailyLogs.where('date').equals(todayKey()).first();
  let penalty = 0;
  if (log?.stressLevel != null && log.stressLevel >= T.dailyStressPenaltyFrom) {
    penalty += T.dailyStressPenalty;
  }
  if (log?.sleepHours != null && log.sleepHours < T.sleepHoursPenaltyBelow) {
    penalty += T.sleepPenalty;
  }
  return penalty;
}

export async function getSubjectiveReadinessBonus(): Promise<number> {
  const fusion = await getFusionReadinessSignal();
  if (fusion == null) return 0;
  if (fusion > 0.3) return T.subjectiveReadinessBonusMax;
  if (fusion > 0) return Math.round(T.subjectiveReadinessBonusMax * 0.5);
  return 0;
}

export async function getPstReadinessBonus(): Promise<number> {
  const params = await getRegulationParams();
  return Math.round(params.pstEfficacy * T.pstEfficacyBonusMax);
}

export async function getMaskBurdenPenalty(): Promise<number> {
  const burden = await getMaskBurden7d();
  if (burden == null || burden < T.maskBurdenPenaltyFrom) return 0;
  return T.maskBurdenPenalty;
}

/** Gate-aligned: days in last 14 with regulation≥60 and foundation≥50. */
export async function getRegulationPractice14d(): Promise<number> {
  const progress = await db.stageProgress.get('progress');
  const history = progress?.readinessHistory ?? [];
  return history
    .slice(-14)
    .filter((e) => e.regulation >= 60 && e.foundation >= 50).length;
}

/** @deprecated UI combo streak; use getRegulationPractice14d for gates. */
export async function getRegulationStreak(): Promise<number> {
  const since = dateKeyDaysAgo(29);
  const [hrvEntries, breathing, mindfulness] = await Promise.all([
    db.hrvEntries.where('date').aboveOrEqual(since).toArray(),
    db.breathingSessions.where('date').aboveOrEqual(since).toArray(),
    db.mindfulnessSessions.where('date').aboveOrEqual(since).toArray(),
  ]);
  const hrvDays = new Set(hrvEntries.map((e) => e.date));
  const breathDays = new Set(breathing.map((s) => s.date));
  const mindfulDays = new Set(mindfulness.map((s) => s.date));
  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    if (hrvDays.has(key) && breathDays.has(key) && mindfulDays.has(key)) streak++;
    else break;
  }
  return streak;
}

export async function getBreathing7dSummary(): Promise<{
  resonant: number;
  wimHof: number;
  total: number;
}> {
  const since = dateKeyDaysAgo(6);
  const sessions = await db.breathingSessions.where('date').aboveOrEqual(since).toArray();
  const resonant = sessions.filter((s) => s.mode === 'resonant').length;
  const wimHof = sessions.filter((s) => s.mode === 'wim_hof').length;
  return { resonant, wimHof, total: sessions.length };
}

export async function getHrvTrendScore(): Promise<number> {
  const trend = await getHrvTrend(7);
  if (trend.length < 2) return 0;
  const first = trend.slice(0, Math.ceil(trend.length / 2));
  const second = trend.slice(Math.ceil(trend.length / 2));
  const avg = (pts: HrvTrendPoint[]) =>
    pts.reduce((a, p) => a + p.rmssd, 0) / Math.max(pts.length, 1);
  const delta = avg(second) - avg(first);
  if (delta > T.hrvTrendDeltaUp) return T.readinessTrendBonusHigh;
  if (delta > 0) return T.readinessTrendBonusLow;
  if (delta < T.hrvTrendDeltaDown) return T.readinessTrendPenalty;
  return 0;
}

export async function hadWimHofToday(): Promise<boolean> {
  const sessions = await db.breathingSessions.where('date').equals(todayKey()).toArray();
  return sessions.some((s) => s.mode === 'wim_hof');
}

export async function hadResonantToday(): Promise<boolean> {
  const sessions = await db.breathingSessions.where('date').equals(todayKey()).toArray();
  return sessions.some((s) => s.mode === 'resonant');
}

export function summarizeBreathingSession(s: BreathingSession): string {
  if (s.mode === 'wim_hof') {
    return `Wim Hof ${s.rounds ?? '?'} раундов, retention ~${s.avgRetentionSec ?? '?'}с`;
  }
  return `Резонанс ${s.durationMin} мин @ ${s.breathsPerMin ?? '?'} вд/мин`;
}

export async function pickBreathProtocolForDay(
  _profile: OperatorProfile,
  date: string
): Promise<BreathProtocolChoice> {
  const { computeReadiness } = await import('./readiness');
  const { computeOperatorMode } = await import('./operator-mode');
  const readiness = await computeReadiness();
  const operatorMode = await computeOperatorMode(readiness);
  const constraints = buildContextConstraints(readiness, operatorMode);
  if (constraints.flags.wimHofBlocked) return 'resonant';

  const breath = await getBreathing7dSummary();
  if (
    breath.wimHof >= T.wimHofOveruse7d &&
    breath.resonant < T.resonantMinWithWim7d
  ) {
    return 'resonant';
  }

  const z = date === todayKey() ? await getHrvZScoreToday() : null;
  if (z != null && z < T.hrvZRecovery) return 'resonant';

  const params = await getRegulationParams();
  const wd = new Date(`${date}T12:00:00`).getDay();
  const calendarWim = wd === 2 || wd === 5;
  if (!calendarWim) return 'resonant';

  if (z != null && z >= 0 && params.wimHofTolerance >= T.wimHofToleranceMin) {
    return 'wimhof';
  }
  if (z == null && params.wimHofTolerance >= 0.5) return 'wimhof';

  return 'resonant';
}

export async function getRegulationOpsSummary(
  readiness?: ReadinessScores
): Promise<RegulationOpsSummary> {
  const r =
    readiness ?? (await (await import('./readiness')).computeReadiness());
  const since = dateKeyDaysAgo(6);
  const params = await getRegulationParams();
  const todayHrv = await db.hrvEntries.where('date').equals(todayKey()).first();

  const [hrv7, mindful7, stress7, breath, practice14d, comboStreak, baseline, resonantMin7d] =
    await Promise.all([
      db.hrvEntries.where('date').aboveOrEqual(since).count(),
      db.mindfulnessSessions.where('date').aboveOrEqual(since).count(),
      db.stressLogs.where('date').aboveOrEqual(since).count(),
      getBreathing7dSummary(),
      getRegulationPractice14d(),
      getRegulationStreak(),
      getHrvBaseline14d(),
      getResonantMinutes7d(),
    ]);

  const hrvZToday =
    todayHrv?.rmssd != null ? await getHrvZScoreForRmssd(todayHrv.rmssd) : null;

  return {
    regulationScore: r.regulation,
    hrv7,
    breath,
    mindful7,
    stress7,
    practice14d,
    comboStreak,
    baseline,
    hrvZToday,
    subjectiveToday: todayHrv?.subjectiveReadiness ?? null,
    pstEfficacy: params.pstEfficacy,
    maskBurden7d: await getMaskBurden7d(),
    resonantMin7d,
    wimHofTolerance: params.wimHofTolerance,
  };
}

export async function buildRegulationDirective(
  readiness?: ReadinessScores
): Promise<RegulationDirective> {
  const { computeReadiness } = await import('./readiness');
  const { computeOperatorMode } = await import('./operator-mode');
  const r = readiness ?? (await computeReadiness());
  const ops = await getRegulationOpsSummary(r);
  const operatorMode = await computeOperatorMode(r);
  const constraints = buildContextConstraints(r, operatorMode);
  const pstDelta = await getPstEfficacy7d();
  const fusion = await getFusionReadinessSignal();

  const calcParts = [
    `regulation=${r.regulation}`,
    ops.hrvZToday != null ? `z_HRV=${ops.hrvZToday.toFixed(2)}` : 'HRV: нет z',
    ops.baseline != null ? `baseline=${ops.baseline}` : null,
    `resonant_7d=${ops.breath.resonant}`,
    `wim_7d=${ops.breath.wimHof}`,
    `resonant_min_7d=${ops.resonantMin7d}`,
    pstDelta != null ? `PST_Δarousal_7d=${pstDelta.toFixed(1)}` : null,
    fusion != null ? `fusion=${fusion.toFixed(2)}` : null,
    ops.maskBurden7d != null ? `mask_7d=${ops.maskBurden7d.toFixed(1)}` : null,
    `wim_tol=${ops.wimHofTolerance.toFixed(2)}`,
  ].filter(Boolean);

  let action = 'Резонанс 10 мин @ 5.5 BPM; HRV check-in утром.';
  if (constraints.flags.wimHofBlocked) {
    action = 'Только резонанс + MMFT 10 мин; Wim Hof запрещён (readiness/foundation).';
  } else if (ops.hrvZToday != null && ops.hrvZToday < T.hrvZRecovery) {
    action = 'Recovery: резонанс 6 мин + MMFT 10 мин; без Wim Hof.';
  } else if (
    ops.breath.wimHof >= T.wimHofOveruse7d &&
    ops.breath.resonant < T.resonantMinWithWim7d
  ) {
    action = 'Резонанс сегодня; Wim Hof отложить (дисбаланс 7д).';
  } else if (ops.wimHofTolerance >= T.wimHofToleranceMin && ops.hrvZToday != null && ops.hrvZToday >= 0) {
    action = 'Допустим Wim Hof по tolerance; иначе резонанс 10 мин @ 5.5 BPM.';
  }

  let denyLine: string | undefined;
  if (ops.hrvZToday != null && ops.hrvZToday < T.hrvZHardDeny) {
    denyLine = 'Не назначать HIFT и когнитивную перегрузку: автономика просела (z < −1.5).';
  } else if (ops.maskBurden7d != null && ops.maskBurden7d >= T.maskBurdenPenaltyFrom) {
    denyLine = `Маска просела (mask_7d=${ops.maskBurden7d.toFixed(1)}): приоритет PST и trigger log.`;
  }

  const dailyPenalty = await getDailyContextPenalty();
  if (dailyPenalty > 0 && !denyLine) {
    denyLine = 'Сон/стресс из daily log: снизить интенсив протоколов.';
  }

  return {
    calculationLine: `[РАСЧЁТ] ${calcParts.join(' · ')}`,
    actionLine: `[ДЕЙСТВИЕ] ${action}`,
    denyLine: denyLine ? `[ОТКАЗ] ${denyLine}` : undefined,
  };
}

export function formatRegulationDirectiveForPrompt(d: RegulationDirective): string {
  return [d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n');
}
