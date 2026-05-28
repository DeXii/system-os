/**
 * ACTION layer — system/AI proposed mutations (validated before kernel apply).
 */

import type { AiAction } from '../types';

export type { AiAction };

export type AiActionType = AiAction['type'];

export type AddMissionAction = AiAction & {
  type: 'add_mission';
  payload: { title: string; taskKey?: string; priority?: string; stage?: string };
};

export type AddProtocolAction = AiAction & {
  type: 'add_protocol';
  payload: { label: string; taskKey?: string; priority?: string; stage?: string };
};

export type MoveSlotAction = AiAction & {
  type: 'move_slot';
  payload: { taskKey: string; toDate?: string };
};

export type CompleteSlotAction = AiAction & {
  type: 'complete_slot';
  payload: { taskKey: string };
};

export type LogNoteAction = AiAction & {
  type: 'log_note';
  payload: { text?: string; note?: string };
};

export type OsAction = AiAction;
