import type { PlanningTemplateParams } from '../../director/director-types';

export function renderPlanningTemplate(params: PlanningTemplateParams): string {
  switch (params.kind) {
    case 'reschedule':
      return `ЗАДАЧА: перенос невыполненных слотов (move_slot, taskKey из schedule.todayQueue).`;
    case 'weekSchedule':
      return `ЗАДАЧА: порядок недели Пн–Вс (3–4 тренировочных дня, кардио опционально).`;
    case 'free':
      return `ЗАДАЧА: ответ на запрос оператора с полным context.
Тренировки — только allowedExerciseIds; при плане — set_workout_plan.`;
    default:
      return '';
  }
}
