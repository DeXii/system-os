import type { TrainingTemplateParams } from '../../director/director-types';

const VARIANT_LABELS: Record<string, string> = {
  hift: 'HIFT (утро, circuit 5×3)',
  gpp: 'GPP (вечер, push/pull/core/legs — subtype в сообщении оператора)',
  gpp_push: 'GPP push',
  gpp_pull: 'GPP pull',
  gpp_core: 'GPP core',
  gpp_legs: 'GPP legs',
  warmup: 'зарядка 15–25 мин, 6–8 упражнений, лёгкая интенсивность',
  stretch: 'растяжка, measure=seconds, удержания 30–90с',
  cardio_intense: 'интенсивное кардио 20–40 мин',
  cardio_easy: 'спокойное кардио 30–60 мин',
  legacy: 'legacy план тренировки',
};

export function renderTrainingTemplate(params: TrainingTemplateParams = {}): string {
  const { mode = 'plan', variant = 'hift', intensity = 'edge', requireActions = false } = params;
  const label = VARIANT_LABELS[variant] ?? variant;

  const lines = [
    `ЗАДАЧА: ${mode === 'coach' ? 'совет по Bar / recovery на сегодня' : `план тренировки — ${label}`}.`,
    'Данные: foundation.calibration, setLogsSummary, setLogsByKind, fitnessLevels, referenceWorkoutTemplates, workoutPlanToday.',
  ];

  if (variant === 'hift' || variant === 'gpp' || variant.startsWith('gpp_')) {
    lines.push(
      'Структура: не ломай эталон referenceWorkoutTemplates (порядок exerciseId, rounds/rest для HIFT, 7 упражнений для GPP).',
      `Интенсивность: ${intensity} — по fitnessLevels и логам 7 дней.`
    );
  }

  if (requireActions) {
    if (variant.startsWith('cardio')) {
      lines.push('Обязательно: set_cardio_session_plan в ## Действия OS.');
    } else {
      lines.push('Обязательно: set_workout_plan в ## Действия OS (только allowedExerciseIds).');
    }
  }

  lines.push(
    'В «Решение»: режим (push/maintain/recovery/deload), сессия, 3 действия, recovery (если coach).'
  );

  return lines.join('\n');
}
