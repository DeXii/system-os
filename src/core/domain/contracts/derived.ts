/**
 * DERIVED layer — computed at runtime, not authoritative persistence.
 * Exceptions documented in states.ts (persistedDerived).
 */

import type {
  DayReport,
  DemotionEvaluation,
  ReadinessScores,
  StageGateEvaluation,
} from '../types';
export type { ReadinessScores, DayReport, StageGateEvaluation, DemotionEvaluation };
export type { OperatorMode, OperatorModeId } from '../../engines/operator-mode';

export interface ComplianceSnapshot {
  date: string;
  protocolPct: number;
  missionPct: number;
  compliance: number;
  briefingDone: boolean;
  debriefDone: boolean;
}

export interface RuleHint {
  id: string;
  message: string;
  severity: 'info' | 'warn' | 'block';
}

export interface ThrottleFlags {
  cognitiveLoad: boolean;
  influence: boolean;
}

export interface ReadinessSnapshot {
  readiness: ReadinessScores;
  computedAt: string;
  basedOnRevision: number;
}

export interface ComplianceCacheEntry {
  date: string;
  snapshot: ComplianceSnapshot;
  computedAt: string;
  basedOnRevision: number;
}
