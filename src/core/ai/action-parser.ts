import type { AiAction } from '../domain/types';

export function parseAiActions(text: string): AiAction[] {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as AiAction[];
    if (!Array.isArray(parsed)) return [];
    const validTypes = new Set([
      'add_mission',
      'add_protocol',
      'log_note',
      'move_slot',
      'complete_slot',
      'add_schedule_slot',
      'set_workout_plan',
    ]);
    return parsed
      .filter(
        (a) =>
          a &&
          typeof a.type === 'string' &&
          validTypes.has(a.type) &&
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
  return text.replace(/## Действия OS[\s\S]*?```json[\s\S]*?```/g, '').trim();
}
