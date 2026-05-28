import type { TrainingTemplateParams } from '../../director/director-types';

const VARIANT_LABELS: Record<string, string> = {
  hift: 'HIFT',
  gpp: 'GPP',
  gpp_push: 'GPP push',
  gpp_pull: 'GPP pull',
  gpp_core: 'GPP core',
  gpp_legs: 'GPP legs',
  warmup: 'зарядка',
  stretch: 'растяжка',
  cardio_intense: 'кардио интенсив',
  cardio_easy: 'кардио лёгкое',
  legacy: 'legacy',
};

export function renderTrainingTemplate(params: TrainingTemplateParams = {}): string {
  const { mode = 'plan', variant = 'hift', requireActions = false } = params;
  const label = VARIANT_LABELS[variant] ?? variant;

  const lines = [
    `ЗАДАЧА: ${mode === 'coach' ? 'совет по recovery' : `план — ${label}`}.`,
    'Почему эта сессия сейчас; минимальный план; что не добавлять в нагрузку.',
  ];

  if (requireActions) {
    lines.push(
      variant.startsWith('cardio')
        ? 'Обязательно: set_cardio_session_plan.'
        : 'Обязательно: set_workout_plan (только allowedExerciseIds).'
    );
  }

  return lines.join('\n');
}
