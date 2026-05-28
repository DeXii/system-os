import type { ReadinessScores } from '../domain/types';
import type { ReadinessSnapshot } from '../domain/contracts/derived';
import { db } from '../db';
import { getGlobalRevision } from '../db/write';
import { computeReadiness } from '../engines/readiness';
import { subscribeCacheInvalidation } from './invalidate';

const SNAPSHOT_ID = 'readiness-live';
let memory: ReadinessSnapshot | null = null;

subscribeCacheInvalidation(() => {
  memory = null;
});

export async function getReadinessCached(): Promise<ReadinessScores> {
  const revision = await getGlobalRevision();
  if (memory && memory.basedOnRevision === revision) {
    return memory.readiness;
  }

  const stored = await db.derivedSnapshots.get(SNAPSHOT_ID);
  if (stored && stored.basedOnRevision === revision && stored.kind === 'readiness') {
    const payload = stored.payload as ReadinessSnapshot;
    memory = payload;
    return payload.readiness;
  }

  const readiness = await computeReadiness();
  const computedAt = new Date().toISOString();
  const snapshot: ReadinessSnapshot = {
    readiness,
    computedAt,
    basedOnRevision: revision,
  };
  memory = snapshot;
  await db.derivedSnapshots.put({
    id: SNAPSHOT_ID,
    kind: 'readiness',
    payload: snapshot,
    computedAt,
    basedOnRevision: revision,
  });
  return readiness;
}

export function clearReadinessMemoryCache(): void {
  memory = null;
}
