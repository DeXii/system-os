import { db, todayKey, uid } from '../db';
import type { DayReport, Mission, MissionPriority, ProtocolItem } from '../domain/types';

const MISSION_WEIGHT: Record<MissionPriority, number> = {
  critical: 2,
  routine: 1,
  optional: 0.5,
};

export function computeMissionWeightedPct(missions: Mission[]): number {
  if (missions.length === 0) return 0;
  let total = 0;
  let done = 0;
  for (const m of missions) {
    const w = MISSION_WEIGHT[m.priority];
    total += w;
    if (m.status === 'done') done += w;
  }
  return total > 0 ? done / total : 0;
}

export function computeProtocolPct(protocol: ProtocolItem[]): number {
  if (protocol.length === 0) return 0;
  const done = protocol.filter((p) => p.done).length;
  return done / protocol.length;
}

export function computeCompliance(protocolPct: number, missionPct: number): number {
  return Math.round(100 * (0.4 * protocolPct + 0.6 * missionPct));
}

export function complianceStageDelta(compliance: number): number {
  const delta = (compliance - 70) / 10;
  return Math.max(-5, Math.min(5, Math.round(delta)));
}

export interface ComplianceSnapshot {
  protocolPct: number;
  missionPct: number;
  compliance: number;
}

export async function getTodayCompliance(date = todayKey()): Promise<ComplianceSnapshot> {
  const [protocol, missions] = await Promise.all([
    db.protocolItems.where('date').equals(date).toArray(),
    db.missions.where('date').equals(date).toArray(),
  ]);
  const protocolPct = computeProtocolPct(protocol);
  const missionPct = computeMissionWeightedPct(missions);
  const compliance = computeCompliance(protocolPct, missionPct);
  return { protocolPct, missionPct, compliance };
}

export async function getOrCreateDayReport(date = todayKey()): Promise<DayReport> {
  const existing = await db.dayReports.where('date').equals(date).first();
  if (existing) {
    const snap = await getTodayCompliance(date);
    if (
      existing.protocolPct !== snap.protocolPct ||
      existing.missionPct !== snap.missionPct ||
      existing.compliance !== snap.compliance
    ) {
      const updated: DayReport = {
        ...existing,
        protocolPct: snap.protocolPct,
        missionPct: snap.missionPct,
        compliance: snap.compliance,
      };
      await db.dayReports.put(updated);
      return updated;
    }
    return existing;
  }

  const snap = await getTodayCompliance(date);
  const report: DayReport = {
    id: uid(),
    date,
    protocolPct: snap.protocolPct,
    missionPct: snap.missionPct,
    compliance: snap.compliance,
    debriefDone: false,
    briefingDone: false,
  };
  await db.dayReports.add(report);
  return report;
}

export async function refreshDayReportCompliance(date = todayKey()): Promise<DayReport> {
  const snap = await getTodayCompliance(date);
  const report = await getOrCreateDayReport(date);
  const updated: DayReport = {
    ...report,
    protocolPct: snap.protocolPct,
    missionPct: snap.missionPct,
    compliance: snap.compliance,
  };
  await db.dayReports.put(updated);
  const { updateIntegrationParamsFromDayReport } = await import('./integration-params');
  await updateIntegrationParamsFromDayReport(updated);
  return updated;
}

export async function markBriefingDone(date = todayKey()): Promise<void> {
  const report = await getOrCreateDayReport(date);
  await db.dayReports.update(report.id, { briefingDone: true });
}

export async function markDebriefDone(
  date = todayKey(),
  eveningNotes?: string
): Promise<DayReport> {
  const refreshed = await refreshDayReportCompliance(date);
  const delta = complianceStageDelta(refreshed.compliance);
  const updated: DayReport = {
    ...refreshed,
    debriefDone: true,
    eveningNotes,
    stageAdjustment: delta,
  };
  await db.dayReports.put(updated);
  const { updateIntegrationParamsFromDayReport } = await import('./integration-params');
  await updateIntegrationParamsFromDayReport(updated);
  return updated;
}
