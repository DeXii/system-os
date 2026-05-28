import type { ComplianceSnapshot } from '../engines/command-compliance';
import { getTodayCompliance } from '../engines/command-compliance';
import { getGlobalRevision } from '../db/write';
import { subscribeCacheInvalidation } from './invalidate';

const byDate = new Map<string, { snap: ComplianceSnapshot; revision: number }>();

subscribeCacheInvalidation(() => {
  byDate.clear();
});

export async function getComplianceCached(date: string): Promise<ComplianceSnapshot> {
  const revision = await getGlobalRevision();
  const hit = byDate.get(date);
  if (hit && hit.revision === revision) return hit.snap;

  const snap = await getTodayCompliance(date);
  byDate.set(date, { snap, revision });
  return snap;
}
