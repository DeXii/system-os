import { db, dateKeyDaysAgo } from '../db';
import type {
  ChessGoSession,
  DecisionLogEntry,
  OperatorMindParams,
  ReflectionEntry,
} from '../domain/types';
import { MIND_THRESHOLDS as T } from './mind-thresholds';

const ALPHA_RATING = 0.15;
const ALPHA_DOSE = 0.1;
const ALPHA_REFLECT = 0.12;
const ALPHA_PEAK = 0.05;
const ALPHA_SWOT = 0.08;

const DEFAULT_PARAMS: OperatorMindParams = {
  id: 'mind-params',
  chessDoseTargetMin: 30,
  reflectEfficacy: 0.5,
  decisionCalibration: 0.5,
  swotTolerance: 0.5,
  calibrationAlpha: 2,
  calibrationBeta: 2,
  lastUpdated: new Date().toISOString(),
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function getMindParams(): Promise<OperatorMindParams> {
  const row = await db.operatorMindParams.get('mind-params');
  return row ?? { ...DEFAULT_PARAMS, lastUpdated: new Date().toISOString() };
}

export async function saveMindParams(
  patch: Partial<Omit<OperatorMindParams, 'id'>>
): Promise<OperatorMindParams> {
  const current = await getMindParams();
  const next: OperatorMindParams = {
    ...current,
    ...patch,
    id: 'mind-params',
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorMindParams.put(next);
  return next;
}

export function getRatingZScore(rating: number, params: OperatorMindParams): number | null {
  if (params.ratingEma == null || params.ratingEma <= 0) return null;
  const sigma = Math.sqrt(Math.max(params.ratingSigmaEma ?? 400, 25));
  if (sigma < 3) return null;
  return (rating - params.ratingEma) / sigma;
}

export async function updateMindParamsFromChess(
  session: Omit<ChessGoSession, 'id'>
): Promise<OperatorMindParams> {
  const current = await getMindParams();
  let patch: Partial<OperatorMindParams> = {};

  const since = dateKeyDaysAgo(6);
  const sessions = await db.chessGoSessions.where('date').aboveOrEqual(since).toArray();
  const chessMin = sessions.reduce((a, s) => a + s.durationMin, 0);
  const chessDoseTargetMin = Math.max(
    T.chessDoseMin,
    Math.min(
      T.chessDoseMax,
      (1 - ALPHA_DOSE) * current.chessDoseTargetMin + ALPHA_DOSE * (chessMin / 7)
    )
  );
  patch = { ...patch, chessDoseTargetMin };

  const rating = session.ratingAfter ?? session.rating;
  if (rating != null && rating > 0) {
    const baseline = current.ratingEma != null && current.ratingEma > 0 ? current.ratingEma : rating;
    const dev = rating - baseline;
    const ratingEma = (1 - ALPHA_RATING) * baseline + ALPHA_RATING * rating;
    const ratingSigmaEma = Math.max(
      25,
      (1 - ALPHA_RATING) * (current.ratingSigmaEma ?? 400) + ALPHA_RATING * dev * dev
    );
    patch = { ...patch, ratingEma, ratingSigmaEma };
  }

  const hour = new Date().getHours();
  const focusAfter = session.focusAfter ?? session.focusBefore;
  if (focusAfter != null && focusAfter >= 4) {
    const cognitivePeakHour =
      current.cognitivePeakHour == null
        ? hour
        : Math.round((1 - ALPHA_PEAK) * current.cognitivePeakHour + ALPHA_PEAK * hour);
    patch = { ...patch, cognitivePeakHour };
  }

  return saveMindParams(patch);
}

function reflectionDepthScore(entry: ReflectionEntry): number {
  const parts = [
    entry.plan,
    entry.monitor,
    entry.reflect,
    entry.observe,
    entry.orient,
    entry.decide,
    entry.act,
  ];
  const filled = parts.filter((p) => p?.trim()).length;
  const chars = parts.reduce((a, p) => a + (p?.trim().length ?? 0), 0);
  return clamp01(filled / 4 + Math.min(0.5, chars / 400));
}

export async function updateMindParamsFromReflection(
  entry: ReflectionEntry
): Promise<OperatorMindParams> {
  const current = await getMindParams();
  const depth = reflectionDepthScore(entry);
  const loadSignal =
    entry.cognitiveLoad != null
      ? clamp01(1 - (entry.cognitiveLoad - 1) / 4)
      : depth;
  const reflectEfficacy = clamp01(
    (1 - ALPHA_REFLECT) * current.reflectEfficacy + ALPHA_REFLECT * loadSignal
  );
  return saveMindParams({ reflectEfficacy });
}

function outcomeMatchesExpected(entry: DecisionLogEntry): boolean | null {
  if (entry.outcomeScore != null) {
    if (entry.outcomeScore >= 1) return true;
    if (entry.outcomeScore <= -1) return false;
    return null;
  }
  const expected = entry.expectedOutcome.trim().toLowerCase();
  const actual = entry.actualOutcome?.trim().toLowerCase() ?? '';
  if (!expected || !actual) return null;
  const negExpected =
    /не |отказ|провал|хуже|минус|убыт|loss|fail/i.test(expected);
  const negActual = /не |отказ|провал|хуже|минус|убыт|loss|fail/i.test(actual);
  if (negExpected === negActual) return true;
  const posExpected = /да|успех|лучше|рост|win|profit/i.test(expected);
  const posActual = /да|успех|лучше|рост|win|profit/i.test(actual);
  if (posExpected && posActual) return true;
  if (posExpected && !posActual) return false;
  return null;
}

export async function updateMindParamsFromDecisionOutcome(
  entry: DecisionLogEntry
): Promise<OperatorMindParams> {
  if (!entry.actualOutcome?.trim() && entry.outcomeScore == null) {
    return getMindParams();
  }

  const current = await getMindParams();
  let alpha = current.calibrationAlpha ?? 2;
  let beta = current.calibrationBeta ?? 2;
  const match = outcomeMatchesExpected(entry);
  if (match === true) alpha += 1;
  else if (match === false) beta += 1;
  else {
    const conf = entry.confidence ?? 3;
    if (entry.outcomeScore != null && entry.outcomeScore >= 0) {
      alpha += conf / 5;
    } else if (entry.outcomeScore != null && entry.outcomeScore < 0) {
      beta += conf / 5;
    }
  }

  const decisionCalibration = alpha / (alpha + beta);
  const swotTolerance = clamp01(
    (1 - ALPHA_SWOT) * current.swotTolerance +
      ALPHA_SWOT * (decisionCalibration >= 0.55 ? 1 : 0.5)
  );

  return saveMindParams({
    calibrationAlpha: alpha,
    calibrationBeta: beta,
    decisionCalibration: clamp01(decisionCalibration),
    swotTolerance,
  });
}
