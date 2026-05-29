/** Cache invalidation hooks — readiness-cache, context-cache subscribe here */

let invalidationListeners = new Set<() => void>();

export function subscribeCacheInvalidation(fn: () => void): () => void {
  invalidationListeners.add(fn);
  return () => invalidationListeners.delete(fn);
}

export function invalidateDerivedCaches(reason: string): void {
  void reason;
  invalidationListeners.forEach((fn) => fn());
}
