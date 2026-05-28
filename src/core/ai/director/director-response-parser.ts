import type { AiAction } from '../../domain/types';

const ACTION_TYPES = new Set([
  'add_mission',
  'add_protocol',
  'log_note',
  'move_slot',
  'complete_slot',
  'add_schedule_slot',
  'set_workout_plan',
  'set_cardio_session_plan',
]);

export function parseAiActions(text: string): AiAction[] {
  const match =
    text.match(/## Действия OS[\s\S]*?```json\s*([\s\S]*?)\s*```/i) ??
    text.match(/## Actions[\s\S]*?```json\s*([\s\S]*?)\s*```/i) ??
    text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as AiAction[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (a) =>
          a &&
          typeof a.type === 'string' &&
          ACTION_TYPES.has(a.type) &&
          a.payload != null &&
          typeof a.payload === 'object' &&
          !Array.isArray(a.payload)
      )
      .map((a) => ({
        type: a.type,
        payload: a.payload as Record<string, unknown>,
      })) as AiAction[];
  } catch {
    return [];
  }
}

export function stripActionsBlock(text: string): string {
  return text
    .replace(/## Действия OS[\s\S]*?```json[\s\S]*?```/gi, '')
    .replace(/## Actions[\s\S]*?```json[\s\S]*?```/gi, '')
    .trim();
}
