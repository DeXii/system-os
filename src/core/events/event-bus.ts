import { db, uid } from '../db';
import type { ModuleId, SystemEvent } from '../domain/types';

type Listener = (event: SystemEvent) => void;
type RefreshListener = () => void;

const listeners = new Set<Listener>();
const refreshListeners = new Set<RefreshListener>();

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

export async function getRecentEvents(limit = 50): Promise<SystemEvent[]> {
  return db.systemEvents.orderBy('timestamp').reverse().limit(limit).toArray();
}
