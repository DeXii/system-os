import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../db';
import {
  EXPORT_TABLE_KEYS,
  EXPORT_VERSION,
  exportSnapshotObject,
  getDataSnapshotStats,
  hasSnapshotData,
  importAllData,
} from '../data/export-import';
import { getCurrentUser } from '../firebase/auth';
import { getFirestoreDb, isFirebaseConfigured } from '../firebase/config';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const DEBOUNCE_MS = 2500;

/** Устаревшая ошибка импорта пустого snapshot (до fix sync db) */
export const STALE_EMPTY_SNAPSHOT_ERROR = 'Нет распознанных таблиц с данными';

export const MSG_CLOUD_EMPTY =
  'В Firebase нет данных OS. Заполните локально (онбординг) и нажмите «Только в облако».';

export const MSG_LOCAL_EMPTY =
  'Локально нет данных OS. Завершите онбординг или импортируйте JSON.';

let status: CloudSyncStatus = 'idle';
let statusError = '';
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let cloudSyncPaused = false;
let listeners = new Set<() => void>();
let dbUnsubscribe: (() => void) | null = null;
let lastRemoteUpdatedAt = '';

function metaDocRef(uid: string) {
  return doc(getFirestoreDb(), 'users', uid, 'meta', 'main');
}

function setStatus(next: CloudSyncStatus, error = ''): void {
  status = next;
  statusError = error;
  listeners.forEach((fn) => fn());
}

export function getCloudSyncStatus(): { status: CloudSyncStatus; error: string } {
  return { status, error: statusError };
}

export function subscribeCloudSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isCloudSyncEnabled(): boolean {
  return isFirebaseConfigured() && !!getCurrentUser();
}

export function isStaleCloudSyncError(error: string): boolean {
  return error === STALE_EMPTY_SNAPSHOT_ERROR;
}

/** Сброс залипшей ошибки validate после обновления приложения */
export function clearCloudSyncError(): void {
  if (status === 'error') {
    setStatus('idle', '');
  }
}

export function clearStaleCloudSyncError(): void {
  if (status === 'error' && isStaleCloudSyncError(statusError)) {
    setStatus('idle', '');
  }
}

export function pauseCloudSync(): void {
  cloudSyncPaused = true;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

export function resumeCloudSync(): void {
  cloudSyncPaused = false;
}

export function isCloudSyncPaused(): boolean {
  return cloudSyncPaused;
}

export function countPayloadTables(
  payload: Record<string, unknown> | undefined
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!payload || typeof payload !== 'object') return counts;
  for (const key of EXPORT_TABLE_KEYS) {
    const val = payload[key];
    counts[key] = Array.isArray(val) ? val.length : 0;
  }
  return counts;
}

export type CloudSnapshotInspect = {
  ok: boolean;
  error?: string;
  exists: boolean;
  cloudEmpty: boolean;
  updatedAt: string;
  tableCounts: Record<string, number>;
  nonEmptyTables: string[];
};

export async function inspectCloudSnapshot(): Promise<CloudSnapshotInspect> {
  if (!isFirebaseConfigured()) {
    return {
      ok: false,
      error: 'Firebase не настроен',
      exists: false,
      cloudEmpty: true,
      updatedAt: '',
      tableCounts: {},
      nonEmptyTables: [],
    };
  }
  const user = getCurrentUser();
  if (!user) {
    return {
      ok: false,
      error: 'Требуется вход',
      exists: false,
      cloudEmpty: true,
      updatedAt: '',
      tableCounts: {},
      nonEmptyTables: [],
    };
  }

  try {
    const snap = await getDoc(metaDocRef(user.uid));
    if (!snap.exists()) {
      return {
        ok: true,
        exists: false,
        cloudEmpty: true,
        updatedAt: '',
        tableCounts: {},
        nonEmptyTables: [],
      };
    }

    const data = snap.data();
    const payload = data.payload as Record<string, unknown> | undefined;
    const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : '';
    const tableCounts = countPayloadTables(payload);
    const nonEmptyTables = Object.entries(tableCounts)
      .filter(([, n]) => n > 0)
      .map(([k]) => k);
    const cloudEmpty = !payload || typeof payload !== 'object' || !hasSnapshotData(payload);

    return {
      ok: true,
      exists: true,
      cloudEmpty,
      updatedAt,
      tableCounts,
      nonEmptyTables,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка чтения облака';
    return {
      ok: false,
      error: msg,
      exists: false,
      cloudEmpty: true,
      updatedAt: '',
      tableCounts: {},
      nonEmptyTables: [],
    };
  }
}

export async function localHasOsData(): Promise<boolean> {
  const stats = await getDataSnapshotStats();
  return Object.values(stats).some((n) => n > 0);
}

export async function pullFromCloud(): Promise<
  | { ok: true; hadData: boolean; cloudEmpty?: boolean }
  | { ok: false; error: string }
> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'Firebase не настроен' };
  }
  const user = getCurrentUser();
  if (!user) return { ok: false, error: 'Требуется вход' };

  setStatus('syncing');
  try {
    const snap = await getDoc(metaDocRef(user.uid));
    if (!snap.exists()) {
      setStatus('synced');
      return { ok: true, hadData: false, cloudEmpty: true };
    }

    const data = snap.data();
    const payload = data.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload !== 'object') {
      setStatus('synced');
      return { ok: true, hadData: false, cloudEmpty: true };
    }

    lastRemoteUpdatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : '';

    if (!hasSnapshotData(payload)) {
      setStatus('synced');
      return { ok: true, hadData: false, cloudEmpty: true };
    }

    await importAllData(JSON.stringify(payload));
    setStatus('synced');
    return { ok: true, hadData: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка загрузки из облака';
    setStatus('error', msg);
    return { ok: false, error: msg };
  }
}

export async function pushToCloud(): Promise<{ ok: boolean; error?: string }> {
  if (!isFirebaseConfigured()) return { ok: false, error: 'Firebase не настроен' };
  const user = getCurrentUser();
  if (!user) return { ok: false, error: 'Требуется вход' };
  if (pushInFlight) return { ok: true };
  if (cloudSyncPaused) return { ok: true };

  pushInFlight = true;
  setStatus('syncing');
  try {
    const payload = await exportSnapshotObject();
    if (!hasSnapshotData(payload)) {
      setStatus('synced');
      return { ok: false, error: MSG_LOCAL_EMPTY };
    }
    const updatedAt = new Date().toISOString();
    await setDoc(metaDocRef(user.uid), {
      version: EXPORT_VERSION,
      updatedAt,
      payload,
    });
    lastRemoteUpdatedAt = updatedAt;
    setStatus('synced');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка сохранения в облако';
    setStatus('error', msg);
    return { ok: false, error: msg };
  } finally {
    pushInFlight = false;
  }
}

export function scheduleCloudPush(): void {
  if (!isCloudSyncEnabled()) return;
  if (cloudSyncPaused) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushToCloud();
  }, DEBOUNCE_MS);
}

export function attachCloudSyncListeners(): () => void {
  if (dbUnsubscribe) return dbUnsubscribe;

  const onChange = () => scheduleCloudPush();
  for (const table of db.tables) {
    table.hook('creating', onChange);
    table.hook('updating', onChange);
    table.hook('deleting', onChange);
  }

  dbUnsubscribe = () => {
    for (const table of db.tables) {
      table.hook('creating').unsubscribe(onChange);
      table.hook('updating').unsubscribe(onChange);
      table.hook('deleting').unsubscribe(onChange);
    }
    dbUnsubscribe = null;
  };
  return dbUnsubscribe;
}

export function detachCloudSyncListeners(): void {
  if (dbUnsubscribe) {
    dbUnsubscribe();
    dbUnsubscribe = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

export function getLastRemoteUpdatedAt(): string {
  return lastRemoteUpdatedAt;
}
