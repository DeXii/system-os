import {
  clearMetricsCache,
  clearReadinessMemoryCache,
  invalidateDerivedCaches,
} from '../cache';
import { db } from '../db';
import {
  deleteCloudSnapshot,
  detachCloudSyncListeners,
  isCloudSyncEnabled,
  pauseCloudSync,
} from '../sync/cloud-sync';

const DB_NAME = 'ayanakoji_os';
const LIBRARY_FILTER_KEY = 'library-filter-level';

export type FactoryResetResult = { ok: true } | { ok: false; error: string };

/** Очищает все таблицы IndexedDB (включая glossaryCache). */
export async function clearAllLocalOsData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}

/** Удаляет только локальную БД (экран ошибки IndexedDB). Облако не трогает. */
export async function resetLocalDatabaseOnly(): Promise<void> {
  detachCloudSyncListeners();
  db.close();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  window.location.reload();
}

function clearSessionHandoff(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(LIBRARY_FILTER_KEY);
}

/**
 * Полный сброс OS: локальные записи + облачный snapshot.
 * Groq и device_id в localStorage не затрагиваются.
 * При успехе перезагружает страницу (онбординг).
 */
export async function factoryResetOs(): Promise<FactoryResetResult> {
  pauseCloudSync();
  detachCloudSyncListeners();

  try {
    await clearAllLocalOsData();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Не удалось очистить локальные данные';
    return { ok: false, error: msg };
  }

  if (isCloudSyncEnabled()) {
    const cloud = await deleteCloudSnapshot();
    if (!cloud.ok) {
      return { ok: false, error: cloud.error ?? 'Не удалось удалить данные из облака' };
    }
  }

  invalidateDerivedCaches('factory-reset');
  clearReadinessMemoryCache();
  clearMetricsCache();
  clearSessionHandoff();

  window.location.reload();
  return { ok: true };
}
