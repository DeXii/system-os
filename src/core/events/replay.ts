import { db } from '../db';
import type { DomainEventRecord } from '../domain/contracts/events';
import { computeCompliance } from '../engines/command-compliance';
import { invalidateDerivedCaches } from '../cache/invalidate';

/** Dev/debug: approximate compliance from domain events (not full replay). */
export async function replayComplianceEstimate(date: string): Promise<number> {
  const events = await db.domainEvents
    .where('timestamp')
    .aboveOrEqual(`${date}T00:00:00`)
    .filter((e) => e.payload && (e.payload as { date?: string }).date === date)
    .toArray();

  const missionDone = events.filter((e) => e.type === 'MISSION_COMPLETED').length;
  const protocolDone = events.filter((e) => e.type === 'PROTOCOL_COMPLETED').length;
  const protocolPct = protocolDone > 0 ? Math.min(1, protocolDone / 4) : 0;
  const missionPct = missionDone > 0 ? Math.min(1, missionDone / 6) : 0;
  return computeCompliance(protocolPct, missionPct);
}

export async function listDomainEventsForReplay(limit = 50): Promise<DomainEventRecord[]> {
  return db.domainEvents.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function invalidateAfterReplay(): Promise<void> {
  invalidateDerivedCaches('replay');
}
