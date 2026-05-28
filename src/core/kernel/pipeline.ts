import { invalidateDerivedCaches } from '../cache/invalidate';
import { emitDomainEvent } from '../events/event-bus';
import type { OsDomainEvent } from '../domain/contracts/events';

export async function afterFactWrite(event?: OsDomainEvent): Promise<void> {
  if (event) {
    await emitDomainEvent(event);
  }
  invalidateDerivedCaches(event?.type ?? 'fact_write');
}
