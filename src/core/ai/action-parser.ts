import type { AiAction } from '../domain/types';

export function parseAiActions(text: string): AiAction[] {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as AiAction[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) =>
        a &&
        typeof a.type === 'string' &&
        (a.type === 'add_mission' ||
          a.type === 'add_protocol' ||
          a.type === 'log_note' ||
          a.type === 'move_slot' ||
          a.type === 'complete_slot' ||
          a.type === 'add_schedule_slot' ||
          a.type === 'set_workout_plan')
    );
  } catch {
    return [];
  }
}

export function stripActionsBlock(text: string): string {
  return text.replace(/## Действия OS[\s\S]*?```json[\s\S]*?```/g, '').trim();
}
