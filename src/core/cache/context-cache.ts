import { getGlobalRevision } from '../db/write';
import { subscribeCacheInvalidation } from './invalidate';

const cache = new Map<string, { json: string; revision: number }>();
const inflight = new Map<string, Promise<string>>();

subscribeCacheInvalidation(() => {
  cache.clear();
  inflight.clear();
});

export async function getCachedContextJson(
  key: string,
  builder: () => Promise<string>
): Promise<string> {
  const revision = await getGlobalRevision();
  const hit = cache.get(key);
  if (hit && hit.revision === revision) return hit.json;

  const pending = inflight.get(key);
  if (pending) return pending;

  const build = (async () => {
    const rev = await getGlobalRevision();
    const cached = cache.get(key);
    if (cached && cached.revision === rev) return cached.json;

    const json = await builder();
    const finalRev = await getGlobalRevision();
    cache.set(key, { json, revision: finalRev });
    return json;
  })();

  inflight.set(key, build);
  try {
    return await build;
  } finally {
    inflight.delete(key);
  }
}

export function contextCacheKey(
  taskId: string,
  lookbackDays: number,
  workoutKind?: string
): string {
  return `${taskId}:${lookbackDays}:${workoutKind ?? 'none'}`;
}

/** @deprecated Use taskId-based contextCacheKey */
export function contextCacheKeyLegacy(
  scope: string | undefined,
  lookbackDays: number,
  workoutKind?: string
): string {
  return `${scope ?? 'full'}:${lookbackDays}:${workoutKind ?? 'none'}`;
}
