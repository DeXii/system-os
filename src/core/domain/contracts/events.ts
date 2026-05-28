/**
 * Domain events — append-only log for debugging, invalidation, replay foundation.
 */

import type { ModuleId, StageId } from '../types';

export type OsDomainEventType =
  | 'MISSION_COMPLETED'
  | 'PROTOCOL_COMPLETED'
  | 'WORKOUT_LOGGED'
  | 'CARDIO_LOGGED'
  | 'HRV_LOGGED'
  | 'BREATHING_LOGGED'
  | 'MINDFULNESS_LOGGED'
  | 'STRESS_LOGGED'
  | 'CHESS_LOGGED'
  | 'REFLECTION_LOGGED'
  | 'INFLUENCE_LOGGED'
  | 'STAGE_ADVANCED'
  | 'STAGE_DEMOTED'
  | 'READINESS_INVALIDATED'
  | 'DAY_BOOTSTRAPPED'
  | 'DIRECTOR_ACTION_APPLIED';

export interface DomainEventRecord {
  id: string;
  type: OsDomainEventType;
  timestamp: string;
  correlationId?: string;
  payload: Record<string, unknown>;
}

export type OsDomainEvent =
  | {
      type: 'MISSION_COMPLETED';
      date: string;
      taskKey: string;
      missionId?: string;
      module: ModuleId;
    }
  | {
      type: 'PROTOCOL_COMPLETED';
      date: string;
      taskKey: string;
      protocolId?: string;
      module: ModuleId;
    }
  | {
      type: 'WORKOUT_LOGGED';
      date: string;
      planId: string;
      kind?: string;
    }
  | {
      type: 'CARDIO_LOGGED';
      date: string;
      sessionId: string;
    }
  | { type: 'HRV_LOGGED'; date: string; entryId: string }
  | { type: 'BREATHING_LOGGED'; date: string; entryId: string; mode: string }
  | { type: 'MINDFULNESS_LOGGED'; date: string; entryId: string }
  | { type: 'STRESS_LOGGED'; date: string; entryId: string }
  | { type: 'CHESS_LOGGED'; date: string; entryId: string }
  | { type: 'REFLECTION_LOGGED'; date: string; entryId: string }
  | { type: 'INFLUENCE_LOGGED'; date: string; entryId: string; influenceType: string }
  | { type: 'STAGE_ADVANCED'; from: StageId; to: StageId }
  | { type: 'STAGE_DEMOTED'; from: StageId; to: StageId }
  | { type: 'READINESS_INVALIDATED'; reason: string }
  | { type: 'DAY_BOOTSTRAPPED'; date: string }
  | { type: 'DIRECTOR_ACTION_APPLIED'; actionCount: number };

export function domainEventToRecord(
  event: OsDomainEvent,
  id: string,
  timestamp: string,
  correlationId?: string
): DomainEventRecord {
  const { type, ...rest } = event;
  return {
    id,
    type,
    timestamp,
    correlationId,
    payload: rest as Record<string, unknown>,
  };
}
