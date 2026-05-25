import type { AiAction } from '../domain/types';

export function formatActionSummary(action: AiAction): string {
  const p = action.payload ?? {};
  switch (action.type) {
    case 'add_mission':
      return `Миссия: ${String(p.title ?? '—')}${p.taskKey ? ` (${String(p.taskKey)})` : ''}`;
    case 'add_protocol':
      return `Протокол: ${String(p.label ?? '—')}${p.taskKey ? ` (${String(p.taskKey)})` : ''}`;
    case 'set_workout_plan': {
      const ex = Array.isArray(p.exercises) ? p.exercises : [];
      return `План тренировки: ${ex.length} упражн.`;
    }
    case 'move_slot':
      return `Перенос: ${String(p.taskKey ?? '—')} → ${String(p.toDate ?? 'завтра')}`;
    case 'complete_slot':
      return `Завершить слот: ${String(p.taskKey ?? '—')}`;
    case 'add_schedule_slot':
      return `Слот: ${String(p.title ?? '—')}`;
    case 'log_note':
      return `Заметка: ${String(p.text ?? p.note ?? '—').slice(0, 80)}`;
    case 'set_cardio_session_plan':
      return `Кардио: ${Number(p.durationMin) || '?'} мин (${String(p.kind ?? '—')})`;
    default:
      return action.type;
  }
}

export function formatActionType(type: AiAction['type']): string {
  const labels: Record<AiAction['type'], string> = {
    add_mission: 'Миссия',
    add_protocol: 'Протокол',
    set_workout_plan: 'Тренировка',
    move_slot: 'Перенос',
    complete_slot: 'Слот ✓',
    add_schedule_slot: 'Расписание',
    log_note: 'Заметка',
    set_cardio_session_plan: 'Кардио',
  };
  return labels[type] ?? type;
}

export function getWorkoutExercises(
  action: AiAction
): { exerciseId: string; sets?: number; targetReps?: number; restSec?: number }[] {
  const exercises = action.payload?.exercises;
  if (action.type !== 'set_workout_plan' || !Array.isArray(exercises)) {
    return [];
  }
  return exercises.filter(Boolean) as {
    exerciseId: string;
    sets?: number;
    targetReps?: number;
    restSec?: number;
  }[];
}
