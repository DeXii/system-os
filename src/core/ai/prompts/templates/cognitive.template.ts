import type { CognitiveTemplateParams } from '../../director/director-types';

export function renderCognitiveTemplate(params: CognitiveTemplateParams): string {
  switch (params.kind) {
    case 'coach':
      return `ЗАДАЧА: план EF, chess/Go, метапознание (PMR/OODA), SWOT при запросе.
Данные: mind.ops7d, studySessionsInWindow, pendingDecisionFollowUps, chessTrendInWindow, cognitiveThrottle.
В «Решение»: когнитивный режим, chess/Go, SWOT/сценарий, 3 действия.`;
    case 'tacticalDebrief':
      return `ЗАДАЧА: разбор решений.
В «Решение»: оценка, искажения, альтернатива, урок.`;
    case 'decisionFollowUp':
      return `ЗАДАЧА: закрыть mind.pendingDecisionFollowUps.
В «Решение»: просроченные решения, сверка прогноз/факт, уроки, действия на сегодня.`;
    default:
      return '';
  }
}
