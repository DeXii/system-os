import type { AiAction } from '../../../domain/types';

export const ACTION_TYPES: AiAction['type'][] = [
  'add_mission',
  'add_protocol',
  'log_note',
  'move_slot',
  'complete_slot',
  'add_schedule_slot',
  'set_workout_plan',
  'set_cardio_session_plan',
];

export function describeActionsForPrompt(allowed: AiAction['type'][]): string {
  if (!allowed.length) {
    return 'Для этой задачи блок «Действия OS» не обязателен; если actions не нужны — передай [].';
  }
  const all: Record<AiAction['type'], string> = {
    add_mission: 'add_mission — { title, taskKey?, priority?, stage? }',
    add_protocol: 'add_protocol — { label, taskKey?, priority?, stage? }',
    set_workout_plan:
      'set_workout_plan — { kind, structure, rounds?, roundRestSec?, gppSubtype?, exercises: [{ exerciseId, sets, targetReps?, targetSeconds?, measure?, restSec }] }',
    set_cardio_session_plan:
      'set_cardio_session_plan — { kind: cardio_intense|cardio_easy, durationMin, suggestedActivity?, notes? }',
    move_slot: 'move_slot — { taskKey, toDate? }',
    complete_slot: 'complete_slot — { taskKey }',
    add_schedule_slot: 'add_schedule_slot — { title, taskKey? }',
    log_note: 'log_note — { text }',
  };
  return `Разрешённые actions (только эти):\n${allowed.map((t) => `- ${all[t]}`).join('\n')}`;
}
