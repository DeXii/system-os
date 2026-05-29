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

function normalizeRawActions(parsed: unknown): AiAction[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (a) =>
        a &&
        typeof a === 'object' &&
        typeof (a as AiAction).type === 'string' &&
        ACTION_TYPES.has((a as AiAction).type) &&
        (a as AiAction).payload != null &&
        typeof (a as AiAction).payload === 'object' &&
        !Array.isArray((a as AiAction).payload)
    )
    .map((a) => ({
      type: (a as AiAction).type,
      payload: (a as AiAction).payload as Record<string, unknown>,
    }));
}

function parseJsonActionsBlock(jsonText: string): AiAction[] {
  try {
    return normalizeRawActions(JSON.parse(jsonText));
  } catch {
    return [];
  }
}

function collectJsonBlocksFromSection(section: string): AiAction[][] {
  const blocks: AiAction[][] = [];
  for (const match of section.matchAll(/```json\s*([\s\S]*?)\s*```/gi)) {
    const actions = parseJsonActionsBlock(match[1]);
    if (actions.length > 0) blocks.push(actions);
  }
  return blocks;
}

function pickBestActionsBlock(blocks: AiAction[][]): AiAction[] {
  if (!blocks.length) return [];
  const withWorkout = blocks.filter((b) => b.some((a) => a.type === 'set_workout_plan'));
  if (withWorkout.length) return withWorkout[withWorkout.length - 1];
  const withCardio = blocks.filter((b) => b.some((a) => a.type === 'set_cardio_session_plan'));
  if (withCardio.length) return withCardio[withCardio.length - 1];
  return blocks[blocks.length - 1];
}

function parseFromActionsSection(text: string): AiAction[] {
  const sectionMatch =
    text.match(/## Действия OS([\s\S]*)/i) ?? text.match(/## Actions([\s\S]*)/i);
  if (!sectionMatch) return [];
  const blocks = collectJsonBlocksFromSection(sectionMatch[1]);
  return pickBestActionsBlock(blocks);
}

export function parseAiActions(text: string): AiAction[] {
  const fromSection = parseFromActionsSection(text);
  if (fromSection.length > 0) return fromSection;

  const fallbackMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!fallbackMatch) return [];
  return parseJsonActionsBlock(fallbackMatch[1]);
}

export function stripActionsBlock(text: string): string {
  return text
    .replace(/## Действия OS[\s\S]*?```json[\s\S]*?```/gi, '')
    .replace(/## Actions[\s\S]*?```json[\s\S]*?```/gi, '')
    .trim();
}
