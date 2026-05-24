import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../db';
import {
  EXPORT_VERSION,
  exportSnapshotObject,
  hasSnapshotData,
  importAllData,
} from '../data/export-import';
import { getCurrentUser } from '../firebase/auth';
import { getFirestoreDb, isFirebaseConfigured } from '../firebase/config';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const DEBOUNCE_MS = 2500;

let status: CloudSyncStatus = 'idle';
let statusError = '';
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
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
      return { ok: true, hadData: false };
    }

    const data = snap.data();
    const payload = data.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload !== 'object') {
      setStatus('synced');
      return { ok: true, hadData: false };
    }

    lastRemoteUpdatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : '';

    if (!hasSnapshotData(payload)) {
      // Пустой или битый snapshot в облаке — не затираем локальные данные
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

  pushInFlight = true;
  setStatus('syncing');
  try {
    const payload = await exportSnapshotObject();
    if (!hasSnapshotData(payload)) {
      setStatus('synced');
      return {
        ok: false,
        error:
          'Локально нет данных OS (завершите калибровку или импорт JSON). В облако ничего не записано.',
      };
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
