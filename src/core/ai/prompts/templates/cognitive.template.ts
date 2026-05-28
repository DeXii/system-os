import type { CognitiveTemplateParams } from '../../director/director-types';

export function renderCognitiveTemplate(params: CognitiveTemplateParams): string {
  switch (params.kind) {
    case 'coach':
      return `ЗАДАЧА: когнитивный план.
Почему такая нагрузка сейчас; один блок (chess/PMR/SWOT по запросу); при cognitiveThrottle — только лёгкое.`;
    case 'tacticalDebrief':
      return `ЗАДАЧА: разбор решений. Урок и один вывод.`;
    case 'decisionFollowUp':
      return `ЗАДАЧА: pendingDecisionFollowUps. Минимальное закрытие просроченного.`;
    default:
      return '';
  }
}
