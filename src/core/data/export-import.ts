import { db } from '../db';

export const EXPORT_VERSION = 17;

export const EXPORT_TABLE_KEYS = [
  'operator',
  'dailyLogs',
  'acftEvents',
  'bftEvents',
  'trainingSessions',
  'hrvEntries',
  'breathingSessions',
  'mindfulnessSessions',
  'stressLogs',
  'pstEntries',
  'chessGoSessions',
  'reflections',
  'scenarios',
  'decisionLogs',
  'libraryBooks',
  'influenceEntries',
  'missions',
  'protocolItems',
  'systemEvents',
  'aiInsights',
  'aiMessages',
  'pdp',
  'dayReports',
  'stageProgress',
  'weekTemplate',
  'dayOverrides',
  'workoutPlans',
  'setLogs',
  'operatorCalibration',
  'operatorFitnessLevels',
  'operatorTrainingParams',
  'operatorRegulationParams',
  'operatorMindParams',
  'operatorInfluenceParams',
  'operatorNutritionParams',
  'operatorIntegrationParams',
  'workoutTypeStats',
  'cardioSessions',
  'contacts',
  'operations',
  'operatorDoctrine',
  'triggerLogs',
  'studySessions',
  'domainEvents',
  'dbMeta',
  'derivedSnapshots',
  'ingredients',
  'dishes',
  'nutritionGoals',
  'operatorBodyMetrics',
  'nutritionPlanState',
  'nutritionDays',
  'mealEntries',
  'shoppingLists',
  'customIngredients',
  'customDishes',
  'glossaryCache',
] as const;

type ExportTableKey = (typeof EXPORT_TABLE_KEYS)[number];

/** Tables excluded from Firebase cloud sync (local debug / ephemeral). */
export const CLOUD_SYNC_SKIP_TABLES = new Set<ExportTableKey>(['domainEvents']);

export const CLOUD_SYNC_TABLE_KEYS = EXPORT_TABLE_KEYS.filter(
  (key) => !CLOUD_SYNC_SKIP_TABLES.has(key)
);

const TABLE_MAP: Record<ExportTableKey, keyof typeof db> = {
  operator: 'operator',
  dailyLogs: 'dailyLogs',
  acftEvents: 'acftEvents',
  bftEvents: 'bftEvents',
  trainingSessions: 'trainingSessions',
  hrvEntries: 'hrvEntries',
  breathingSessions: 'breathingSessions',
  mindfulnessSessions: 'mindfulnessSessions',
  stressLogs: 'stressLogs',
  pstEntries: 'pstEntries',
  chessGoSessions: 'chessGoSessions',
  reflections: 'reflections',
  scenarios: 'scenarios',
  decisionLogs: 'decisionLogs',
  libraryBooks: 'libraryBooks',
  influenceEntries: 'influenceEntries',
  missions: 'missions',
  protocolItems: 'protocolItems',
  systemEvents: 'systemEvents',
  aiInsights: 'aiInsights',
  aiMessages: 'aiMessages',
  pdp: 'pdp',
  dayReports: 'dayReports',
  stageProgress: 'stageProgress',
  weekTemplate: 'weekTemplate',
  dayOverrides: 'dayOverrides',
  workoutPlans: 'workoutPlans',
  setLogs: 'setLogs',
  operatorCalibration: 'operatorCalibration',
  operatorFitnessLevels: 'operatorFitnessLevels',
  operatorTrainingParams: 'operatorTrainingParams',
  operatorRegulationParams: 'operatorRegulationParams',
  operatorMindParams: 'operatorMindParams',
  operatorInfluenceParams: 'operatorInfluenceParams',
  operatorNutritionParams: 'operatorNutritionParams',
  operatorIntegrationParams: 'operatorIntegrationParams',
  workoutTypeStats: 'workoutTypeStats',
  cardioSessions: 'cardioSessions',
  contacts: 'contacts',
  operations: 'operations',
  operatorDoctrine: 'operatorDoctrine',
  triggerLogs: 'triggerLogs',
  studySessions: 'studySessions',
  domainEvents: 'domainEvents',
  dbMeta: 'dbMeta',
  derivedSnapshots: 'derivedSnapshots',
  ingredients: 'ingredients',
  dishes: 'dishes',
  nutritionGoals: 'nutritionGoals',
  operatorBodyMetrics: 'operatorBodyMetrics',
  nutritionPlanState: 'nutritionPlanState',
  nutritionDays: 'nutritionDays',
  mealEntries: 'mealEntries',
  shoppingLists: 'shoppingLists',
  customIngredients: 'customIngredients',
  customDishes: 'customDishes',
  glossaryCache: 'glossaryCache',
};

function getTable(key: ExportTableKey) {
  return db[TABLE_MAP[key]] as import('dexie').Table<unknown, string>;
}

export async function getDataSnapshotStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  for (const key of EXPORT_TABLE_KEYS) {
    stats[key] = await getTable(key).count();
  }
  return stats;
}

export function validateImportPayload(
  data: unknown
): { ok: true; version: number } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Файл не является объектом JSON' };
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.version !== 'number') {
    return { ok: false, error: 'Отсутствует поле version' };
  }
  if (obj.version > EXPORT_VERSION) {
    return {
      ok: false,
      error: `Версия ${obj.version} новее поддерживаемой (${EXPORT_VERSION})`,
    };
  }
  const hasAnyTable = EXPORT_TABLE_KEYS.some(
    (key) => Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0
  );
  if (!hasAnyTable) {
    return { ok: false, error: 'Нет распознанных таблиц с данными' };
  }
  for (const key of EXPORT_TABLE_KEYS) {
    const val = obj[key];
    if (val != null && !Array.isArray(val)) {
      return { ok: false, error: `Поле ${key} должно быть массивом` };
    }
  }
  return { ok: true, version: obj.version };
}

/** Есть ли в snapshot хотя бы одна непустая таблица OS */
export function hasSnapshotData(data: unknown): boolean {
  const valid = validateImportPayload(data);
  return valid.ok;
}

/** Удаляет undefined из объектов/массивов для Firestore (через JSON round-trip). */
export function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function exportSnapshotObject(options?: {
  forCloud?: boolean;
}): Promise<Record<string, unknown>> {
  const keys = options?.forCloud ? CLOUD_SYNC_TABLE_KEYS : EXPORT_TABLE_KEYS;
  const data: Record<string, unknown> = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
  };
  for (const key of keys) {
    data[key] = await getTable(key).toArray();
  }
  return sanitizeForFirestore(data);
}

export async function exportAllData(): Promise<string> {
  return JSON.stringify(await exportSnapshotObject(), null, 2);
}

/** Upsert snapshot rows without clearing tables (union-safe cloud merge). */
export async function applyMergedSnapshot(snapshot: Record<string, unknown>): Promise<void> {
  const valid = validateImportPayload(snapshot);
  if (!valid.ok) throw new Error(valid.error);

  const { pauseCloudSync, resumeCloudSync, scheduleCloudPush, isCloudSyncEnabled } =
    await import('../sync/cloud-sync');

  pauseCloudSync();
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const [key, tableName] of Object.entries(TABLE_MAP)) {
        if (CLOUD_SYNC_SKIP_TABLES.has(key as ExportTableKey)) continue;
        const rows = snapshot[key];
        if (!Array.isArray(rows) || !rows.length) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db[tableName] as any).bulkPut(rows);
      }
    });
  } finally {
    resumeCloudSync();
  }

  if (isCloudSyncEnabled()) scheduleCloudPush();
}

export async function importAllData(json: string): Promise<void> {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const valid = validateImportPayload(parsed);
  if (!valid.ok) throw new Error(valid.error);

  const { pauseCloudSync, resumeCloudSync, scheduleCloudPush, isCloudSyncEnabled } =
    await import('../sync/cloud-sync');

  pauseCloudSync();
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
      for (const [key, tableName] of Object.entries(TABLE_MAP)) {
        const rows = parsed[key];
        if (Array.isArray(rows) && rows.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db[tableName] as any).bulkAdd(rows);
        }
      }
    });
  } finally {
    resumeCloudSync();
  }

  if (isCloudSyncEnabled()) scheduleCloudPush();
}

export function downloadExportJson(
  json: string,
  date = new Date(),
  filename?: string
): void {
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename ?? `ayanakoji-export-${date.toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
