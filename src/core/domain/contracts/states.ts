/**
 * STATE layer — current OS configuration and persisted snapshots of derived data.
 */

import type {
  ModuleId,
  ModuleStatus,
  OperatorProfile,
  StageProgressState,
} from '../types';

export type { OperatorProfile, StageProgressState, ModuleId, ModuleStatus };

/**
 * @persistedDerived — stored in IndexedDB for gate history; do not treat as live readiness.
 */
export type PersistedStageProgress = StageProgressState;

/**
 * @snapshot — compliance snapshot for a day; recalculate only via command-compliance rules.
 */
export type PersistedDayReport = import('../types').DayReport;

export interface DbMetaState {
  id: 'db-meta';
  globalRevision: number;
  lastUpdated: string;
  deviceId: string;
}

export interface DerivedSnapshotRecord {
  id: string;
  kind: 'readiness' | 'compliance';
  date?: string;
  payload: unknown;
  computedAt: string;
  basedOnRevision: number;
}
