import type { EntityMeta, EntitySource } from '../domain/contracts/facts';
import { db } from './index';

const DEVICE_KEY = 'ayanakoji_device_id';

export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'server';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function getGlobalRevision(): Promise<number> {
  const meta = await db.dbMeta.get('db-meta');
  return meta?.globalRevision ?? 0;
}

export async function bumpGlobalRevision(): Promise<number> {
  const now = new Date().toISOString();
  const existing = await db.dbMeta.get('db-meta');
  const next = (existing?.globalRevision ?? 0) + 1;
  await db.dbMeta.put({
    id: 'db-meta',
    globalRevision: next,
    lastUpdated: now,
    deviceId: getDeviceId(),
  });
  return next;
}

export function withEntityMeta<T extends object>(
  row: T,
  source: EntitySource = 'manual'
): T & EntityMeta {
  const now = new Date().toISOString();
  const existing = row as T & Partial<EntityMeta>;
  return {
    ...row,
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
    source: existing.source ?? source,
    revision: (existing.revision ?? 0) + 1,
    deviceId: getDeviceId(),
  };
}

export async function addWithMeta<T extends object & { id: string }>(
  table: { add: (item: T) => Promise<string> },
  row: T,
  source: EntitySource = 'manual'
): Promise<string> {
  await bumpGlobalRevision();
  return table.add(withEntityMeta(row, source) as T);
}

export async function putWithMeta<T extends object & { id: string }>(
  table: { put: (item: T) => Promise<string> },
  row: T,
  source: EntitySource = 'manual'
): Promise<string> {
  await bumpGlobalRevision();
  return table.put(withEntityMeta(row, source) as T);
}

export async function updateWithMeta(
  table: { update: (id: string, patch: object) => Promise<number> },
  id: string,
  patch: object,
  source?: EntitySource
): Promise<void> {
  await bumpGlobalRevision();
  const now = new Date().toISOString();
  await table.update(id, {
    ...patch,
    updatedAt: now,
    deviceId: getDeviceId(),
    ...(source ? { source } : {}),
  });
}
