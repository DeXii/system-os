import { db } from '../db';

export const DOMAIN_EVENTS_RETENTION_DAYS = 30;

const PRUNE_DEBOUNCE_MS = 60_000;

let pruneTimer: ReturnType<typeof setTimeout> | null = null;

export function retentionCutoff(retentionDays = DOMAIN_EVENTS_RETENTION_DAYS): string {
  return new Date(Date.now() - retentionDays * 86_400_000).toISOString();
}

/** Deletes domain events older than retention window. Returns number of deleted rows. */
export async function pruneDomainEvents(
  retentionDays = DOMAIN_EVENTS_RETENTION_DAYS
): Promise<number> {
  const cutoff = retentionCutoff(retentionDays);
  return db.domainEvents.where('timestamp').below(cutoff).delete();
}

export function schedulePruneDomainEvents(): void {
  if (pruneTimer) clearTimeout(pruneTimer);
  pruneTimer = setTimeout(() => {
    pruneTimer = null;
    void pruneDomainEvents();
  }, PRUNE_DEBOUNCE_MS);
}
