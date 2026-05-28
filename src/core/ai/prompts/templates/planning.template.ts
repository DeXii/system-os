import type { PlanningTemplateParams } from '../../director/director-types';

export function renderPlanningTemplate(params: PlanningTemplateParams): string {
  switch (params.kind) {
    case 'reschedule':
      return `ЗАДАЧА: перенос слотов (move_slot). Минимум переносов — только критичное.`;
    case 'weekSchedule':
      return `ЗАДАЧА: порядок недели. 3–4 тренировочных дня; без перегруза.`;
    case 'free':
      return `ЗАДАЧА: запрос оператора. Почему ответ такой; минимальный шаг; тренировки — allowedExerciseIds. Не предлагать новые сущности OS без запроса.`;
    default:
      return '';
  }
}
