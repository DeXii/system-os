import { invalidateDerivedCaches } from '../cache/invalidate';
import { bumpGlobalRevision } from '../db/write';
import { emitDomainEvent, invalidateReadiness } from '../events/event-bus';
import type { OsDomainEvent } from '../domain/contracts/events';

export async function afterFactWrite(event?: OsDomainEvent): Promise<void> {
  if (event?.type === 'READINESS_INVALIDATED') {
    invalidateReadiness(event.reason);
    await bumpGlobalRevision();
    return;
  }
  if (event) {
    await emitDomainEvent(event);
  }
  await bumpGlobalRevision();
  invalidateDerivedCaches(event?.type ?? 'fact_write');
}
