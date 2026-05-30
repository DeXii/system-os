import { db, dateKeyDaysAgo } from '../db';
import type { InfluenceEntry } from '../domain/types';
import { getInfluenceParams } from './influence-params';
import { INFLUENCE_THRESHOLDS as T } from './influence-thresholds';
import { oarsCompleteness } from './influence-quality';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function hasInfluenceSince(since: string): Promise<boolean> {
  return (await db.influenceEntries.where('date').aboveOrEqual(since).count()) > 0;
}

async function isInfluenceColdStart(): Promise<boolean> {
  const sinceCold = dateKeyDaysAgo(T.coldLookbackDays);
  return !(await hasInfluenceSince(sinceCold));
}

function avgEntryDepth(entries: InfluenceEntry[]): number {
  const mi = entries.filter((e) => e.type === 'mi');
  if (!mi.length) return 0;
  return mi.reduce((a, e) => a + oarsCompleteness(e), 0) / mi.length;
}

export interface InfluenceReadinessComponents {
  miScore: number;
  nudgeScore: number;
  protocolScore: number;
  extraScore: number;
  dossierScore: number;
  qualityBonus: number;
  total: number;
}

export async function computeInfluenceReadinessComponents(): Promise<InfluenceReadinessComponents> {
  if (await isInfluenceColdStart()) {
    return {
      miScore: 0,
      nudgeScore: 0,
      protocolScore: 0,
      extraScore: 0,
      dossierScore: 0,
      qualityBonus: 0,
      total: T.coldStart,
    };
  }

  const since = dateKeyDaysAgo(13);
  const entries = await db.influenceEntries.where('date').aboveOrEqual(since).toArray();
  const miEntries = entries.filter((e) => e.type === 'mi');
  const miCount = miEntries.length;
  const nudgeCount = entries.filter((e) => e.type === 'nudge').length;
  const protocolDays = new Set(
    entries.filter((e) => e.type === 'protocol').map((e) => e.date)
  ).size;
  const biasOrObs = entries.filter(
    (e) => e.type === 'bias' || e.type === 'observation' || e.type === 'debrief'
  ).length;

  const miScore = Math.min(
    T.miScoreMax,
    (miCount / T.miCountTarget14d) * T.miScoreMax
  );
  const nudgeScore = Math.min(T.nudgeScoreMax, nudgeCount >= 1 ? T.nudgeScoreMax : 0);
  const protocolScore = Math.min(
    T.protocolScoreMax,
    (protocolDays / T.protocolDaysTarget14d) * T.protocolScoreMax
  );
  const extraScore = Math.min(T.biasObsScoreMax, biasOrObs >= 1 ? T.biasObsScoreMax : 0);

  const contactCount = await db.contacts.count();
  const activeOps = (
    await db.operations
      .filter((o) => o.phase !== 'closed' && o.status !== 'lost')
      .count()
  );
  const dossierScore =
    Math.min(T.dossierContactScore, contactCount >= 1 ? T.dossierContactScore : 0) +
    Math.min(T.dossierOpsScore, activeOps >= 1 ? T.dossierOpsScore : 0);

  const params = await getInfluenceParams();
  const windowDepth = avgEntryDepth(miEntries);
  const depthSignal = (params.miDepthEma + windowDepth) / 2;
  const efficacySignal = params.miEfficacyEma;
  const depthFactor = Math.min(1, depthSignal / T.miDepthEmaForFullQuality);
  const efficacyFactor = Math.min(1, efficacySignal / T.miEfficacyEmaForFullQuality);
  const qualityBonus = Math.min(
    T.qualityBonusMax,
    ((depthFactor + efficacyFactor) / 2) * T.qualityBonusMax
  );

  const total = clamp(
    miScore + nudgeScore + protocolScore + extraScore + dossierScore + qualityBonus
  );

  return {
    miScore,
    nudgeScore,
    protocolScore,
    extraScore,
    dossierScore,
    qualityBonus,
    total,
  };
}

export async function computeInfluenceScore(): Promise<number> {
  const c = await computeInfluenceReadinessComponents();
  return c.total;
}
