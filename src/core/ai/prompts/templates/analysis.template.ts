import type { AnalysisTemplateParams } from '../../director/director-types';

export function renderAnalysisTemplate(params: AnalysisTemplateParams): string {
  const { kind, days } = params;

  if (kind === 'deep') {
    const d = days ?? 14;
    return `ЗАДАЧА: анализ за ${d} дн.
Почему bottleneck сейчас; минимальный план на ${d === 30 ? '14' : '7'} дней; что не трогать.`;
  }

  switch (kind) {
    case 'weekly':
      return `ЗАДАЧА: аудит недели.
Одна главная корректировка; synergy/bottleneck по fact.`;
    case 'pdp':
      return `ЗАДАЧА: PDP.
Почему фокус недели такой; один шаг по PDP.`;
    case 'stageGate':
      return `ЗАДАЧА: gate / demotion.
Минимальный план 7 дней; критерий advance.`;
    case 'doctrine':
      return `ЗАДАЧА: сверка doctrine.
Что не соответствует; один фокус на 7 дней.`;
    default:
      return '';
  }
}
