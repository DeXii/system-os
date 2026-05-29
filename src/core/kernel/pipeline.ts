import { invalidateDerivedCaches } from '../cache/invalidate';
import { bumpGlobalRevision } from '../db/write';
import { emitDomainEvent } from '../events/event-bus';
import type { OsDomainEvent } from '../domain/contracts/events';

export async function afterFactWrite(event?: OsDomainEvent): Promise<void> {
  if (event) {
    await emitDomainEvent(event);
  }
  await bumpGlobalRevision();
  invalidateDerivedCaches(event?.type ?? 'fact_write');
}
