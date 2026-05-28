import { getGlobalRevision } from '../db/write';
import { subscribeCacheInvalidation } from './invalidate';

const cache = new Map<string, { json: string; revision: number }>();

subscribeCacheInvalidation(() => {
  cache.clear();
});

export async function getCachedContextJson(
  key: string,
  builder: () => Promise<string>
): Promise<string> {
  const revision = await getGlobalRevision();
  const hit = cache.get(key);
  if (hit && hit.revision === revision) return hit.json;

  const json = await builder();
  cache.set(key, { json, revision });
  return json;
}

export function contextCacheKey(
  scope: string | undefined,
  lookbackDays: number,
  workoutKind?: string
): string {
  return `${scope ?? 'full'}:${lookbackDays}:${workoutKind ?? 'none'}`;
}
