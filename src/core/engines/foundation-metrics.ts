import { db, dateKeyDaysAgo, todayKey } from '../db';
import type { OperatorTrainingParams, ReadinessScores, WorkoutKind } from '../domain/types';
import { computeReadiness } from './readiness';
import { getRecommendedGppSubtype, getWorkoutTypeStat } from './workout-stats';
import { getHrvBaseline14d, isHrvBelowBaseline } from './regulation-metrics';
import { getTrainingParams } from './training-params';
import {
  applyLoadCapToPlanned,
  getFoundationLoadModifiers,
  type FoundationLoadModifiers,
} from './foundation-load';

export type { FoundationLoadModifiers };
export { applyLoadCapToPlanned, getFoundationLoadModifiers };

export interface FoundationOpsSummary {
  foundationScore: number;
  sessions7d: number;
  setLogs7d: number;
  hiftLast: string | null;
  recommendedGpp: string;
  fatigue: number;
  strengthPull: number;
  strengthPush: number;
  recoveryPrior: number;
  hrvBaseline: number | null;
  hrvBelowBaseline: boolean;
  loadModifiers: FoundationLoadModifiers;
}

export async function getFoundationOpsSummary(
  readiness?: ReadinessScores
): Promise<FoundationOpsSummary> {
  const r = readiness ?? (await computeReadiness());
  const since = dateKeyDaysAgo(6);
  const sessions7d = await db.trainingSessions.where('date').aboveOrEqual(since).count();
  const setLogs7d = await db.setLogs.where('date').aboveOrEqual(since).count();
  const hiftStat = await getWorkoutTypeStat('hift');
  const recommendedGpp = await getRecommendedGppSubtype();
  const params = await getTrainingParams();
  const loadModifiers = await getFoundationLoadModifiers();
  const hrvBaseline = await getHrvBaseline14d();
  const todayHrv = await db.hrvEntries.where('date').equals(todayKey()).first();
  const hrvBelow = todayHrv != null && (await isHrvBelowBaseline(todayHrv));

  return {
    foundationScore: r.foundation,
    sessions7d,
    setLogs7d,
    hiftLast: hiftStat.lastDate,
    recommendedGpp,
    fatigue: params.fatigue,
    strengthPull: params.strengthPull,
    strengthPush: params.strengthPush,
    recoveryPrior: params.recoveryPrior,
    hrvBaseline,
    hrvBelowBaseline: hrvBelow,
    loadModifiers,
  };
}

export interface FoundationDirective {
  calculationLine: string;
  actionLine: string;
  denyLine?: string;
}

export async function buildFoundationDirective(
  readiness?: ReadinessScores,
  params?: OperatorTrainingParams
): Promise<FoundationDirective> {
  const r = readiness ?? (await computeReadiness());
  const p = params ?? (await getTrainingParams());
  const ops = await getFoundationOpsSummary(r);
  const gpp = ops.recommendedGpp;

  const hiftGap =
    ops.hiftLast == null
      ? '7д без HIFT'
      : (() => {
          const d = Math.floor(
            (Date.now() - new Date(`${ops.hiftLast}T12:00:00`).getTime()) / 86400000
          );
          return d >= 3 ? `${d}д без HIFT` : null;
        })();

  const calcParts = [
    `foundation=${r.foundation}`,
    hiftGap,
    `fatigue=${p.fatigue.toFixed(2)}`,
    `pull=${p.strengthPull.toFixed(2)}`,
    `push=${p.strengthPush.toFixed(2)}`,
    ops.hrvBelowBaseline ? 'HRV<baseline' : null,
  ].filter(Boolean);

  const actionParts: string[] = [];
  if (r.foundation < 45 || ops.loadModifiers.deload) {
    actionParts.push(`deload: объём ×${ops.loadModifiers.volumeMultiplier.toFixed(2)}`);
  } else {
    actionParts.push(`HIFT при готовности; GPP вечером — ${gpp}`);
  }

  const yesterday = dateKeyDaysAgo(1);
  const dayReport = await db.dayReports.where('date').equals(yesterday).first();
  let denyLine: string | undefined;
  if (dayReport && dayReport.compliance < 50) {
    denyLine = `Не добавлять объём: compliance вчера ${dayReport.compliance}.`;
  } else if (ops.loadModifiers.hrvBelowBaseline) {
    denyLine = 'Не добавлять интенсив: HRV ниже baseline.';
  } else if (p.fatigue > 0.7) {
    denyLine = `Снизить объём: fatigue=${p.fatigue.toFixed(2)}.`;
  }

  return {
    calculationLine: `[РАСЧЁТ] ${calcParts.join(' · ')}`,
    actionLine: `[ДЕЙСТВИЕ] ${actionParts.join('. ')}`,
    denyLine: denyLine ? `[ОТКАЗ] ${denyLine}` : undefined,
  };
}

export function formatFoundationDirectiveForPrompt(d: FoundationDirective): string {
  return [d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n');
}

export function kindLabel(kind: WorkoutKind): string {
  if (kind === 'hift') return 'HIFT';
  if (kind.startsWith('gpp_')) return `GPP ${kind.replace('gpp_', '')}`;
  if (kind === 'warmup') return 'зарядка';
  if (kind === 'stretch') return 'растяжка';
  return kind;
}
