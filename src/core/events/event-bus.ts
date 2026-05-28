import { db, uid } from '../db';
import type { ModuleId, SystemEvent } from '../domain/types';
import type { DomainEventRecord, OsDomainEvent } from '../domain/contracts/events';
import { domainEventToRecord } from '../domain/contracts/events';
import { invalidateDerivedCaches } from '../cache/invalidate';

type Listener = (event: SystemEvent) => void;
type RefreshListener = () => void;
type DomainListener = (event: DomainEventRecord) => void;

const listeners = new Set<Listener>();
const refreshListeners = new Set<RefreshListener>();
const domainListeners = new Set<DomainListener>();

export async function emitKernel(
  module: ModuleId,
  message: string,
  level: SystemEvent['level'] = 'info',
  taskKey?: string
): Promise<SystemEvent> {
  const event: SystemEvent = {
    id: uid(),
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    taskKey,
  };
  await db.systemEvents.add(event);
  listeners.forEach((fn) => fn(event));
  return event;
}

export async function emitDomainEvent(
  event: OsDomainEvent,
  correlationId?: string
): Promise<DomainEventRecord> {
  const id = uid();
  const timestamp = new Date().toISOString();
  const record = domainEventToRecord(event, id, timestamp, correlationId);
  await db.domainEvents.add(record);
  domainListeners.forEach((fn) => fn(record));
  if (event.type === 'READINESS_INVALIDATED' || event.type.endsWith('_LOGGED')) {
    invalidateDerivedCaches(event.type);
  }
  return record;
}

export function emitOsRefresh(): void {
  refreshListeners.forEach((fn) => fn());
}

export function subscribeKernel(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function subscribeOsRefresh(fn: RefreshListener): () => void {
  refreshListeners.add(fn);
  return () => refreshListeners.delete(fn);
}

export function subscribeDomainEvent(fn: DomainListener): () => void {
  domainListeners.add(fn);
  return () => domainListeners.delete(fn);
}

export async function getRecentEvents(limit = 50): Promise<SystemEvent[]> {
  return db.systemEvents.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function getRecentDomainEvents(limit = 50): Promise<DomainEventRecord[]> {
  return db.domainEvents.orderBy('timestamp').reverse().limit(limit).toArray();
}
