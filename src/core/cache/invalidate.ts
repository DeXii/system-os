/** Cache invalidation hooks — expanded in readiness-cache / compliance-cache */

let invalidationListeners = new Set<() => void>();

export function subscribeCacheInvalidation(fn: () => void): () => void {
  invalidationListeners.add(fn);
  return () => invalidationListeners.delete(fn);
}

export function invalidateDerivedCaches(reason: string): void {
  void reason;
  invalidationListeners.forEach((fn) => fn());
}
