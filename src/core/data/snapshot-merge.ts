import type { EntityMeta } from '../domain/contracts/facts';
import { EXPORT_TABLE_KEYS, EXPORT_VERSION } from './export-import';

export type ExportSnapshot = Record<string, unknown> & {
  version: number;
  exportedAt?: string;
  mergedAt?: string;
};

type RowWithMeta = EntityMeta & { id?: string };

const SINGLETON_TABLES = new Set<string>([
  'operator',
  'stageProgress',
  'weekTemplate',
  'dbMeta',
  'nutritionPlanState',
  'pdp',
  'derivedSnapshots',
  'operatorDoctrine',
  'operatorCalibration',
  'operatorFitnessLevels',
  'operatorBodyMetrics',
  'glossaryCache',
]);

function rowScore(row: RowWithMeta): [number, number, string] {
  const rev = row.revision ?? 0;
  const updated = row.updatedAt ? Date.parse(row.updatedAt) || 0 : 0;
  return [rev, updated, row.deviceId ?? ''];
}

function pickWinner<T extends RowWithMeta>(local: T, remote: T): T {
  const ls = rowScore(local);
  const rs = rowScore(remote);
  if (rs[0] !== ls[0]) return rs[0] > ls[0] ? remote : local;
  if (rs[1] !== ls[1]) return rs[1] > ls[1] ? remote : local;
  if (rs[2] !== ls[2]) return rs[2] > ls[2] ? remote : local;
  return remote;
}

function hasRowIds(rows: unknown[]): boolean {
  return rows.some(
    (r) => r && typeof r === 'object' && 'id' in r && typeof (r as { id: string }).id === 'string'
  );
}

function mergeTableRows(local: unknown[], remote: unknown[]): unknown[] {
  const byId = new Map<string, unknown>();
  const noId: unknown[] = [];

  for (const row of local) {
    if (row && typeof row === 'object' && 'id' in row && typeof (row as { id: string }).id === 'string') {
      byId.set((row as { id: string }).id, row);
    } else if (row != null) {
      noId.push(row);
    }
  }

  for (const row of remote) {
    if (row && typeof row === 'object' && 'id' in row && typeof (row as { id: string }).id === 'string') {
      const id = (row as { id: string }).id;
      const existing = byId.get(id);
      if (!existing) byId.set(id, row);
      else byId.set(id, pickWinner(existing as RowWithMeta, row as RowWithMeta));
    } else if (row != null) {
      noId.push(row);
    }
  }

  return [...byId.values(), ...noId];
}

function snapshotRevision(snap: ExportSnapshot): number {
  const metaRows = snap.dbMeta;
  if (!Array.isArray(metaRows) || !metaRows[0] || typeof metaRows[0] !== 'object') return 0;
  const rev = (metaRows[0] as { globalRevision?: number }).globalRevision;
  return typeof rev === 'number' ? rev : 0;
}

function mergeSingletonTable(
  local: unknown[],
  remote: unknown[],
  localRev: number,
  remoteRev: number
): unknown[] {
  if (!local.length) return remote;
  if (!remote.length) return local;
  if (remoteRev > localRev) return remote;
  if (localRev > remoteRev) return local;
  return [pickWinner(local[0] as RowWithMeta, remote[0] as RowWithMeta)];
}

/** Union merge: local rows absent in remote are kept; conflicts resolved by EntityMeta. */
export function mergeSnapshots(local: ExportSnapshot, remote: ExportSnapshot): ExportSnapshot {
  const localRev = snapshotRevision(local);
  const remoteRev = snapshotRevision(remote);
  const merged: ExportSnapshot = {
    version: Math.max(
      typeof local.version === 'number' ? local.version : 0,
      typeof remote.version === 'number' ? remote.version : 0,
      EXPORT_VERSION
    ),
    exportedAt: new Date().toISOString(),
    mergedAt: new Date().toISOString(),
  };

  for (const key of EXPORT_TABLE_KEYS) {
    const l = Array.isArray(local[key]) ? (local[key] as unknown[]) : [];
    const r = Array.isArray(remote[key]) ? (remote[key] as unknown[]) : [];

    if (SINGLETON_TABLES.has(key)) {
      merged[key] = mergeSingletonTable(l, r, localRev, remoteRev);
    } else if (!l.length) {
      merged[key] = r;
    } else if (!r.length) {
      merged[key] = l;
    } else if (!hasRowIds(l) && !hasRowIds(r)) {
      merged[key] = remoteRev >= localRev ? r : l;
    } else {
      merged[key] = mergeTableRows(l, r);
    }
  }

  return merged;
}
