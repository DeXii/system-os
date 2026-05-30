import type { CognitiveTemplateParams } from '../../director/director-types';

export function renderCognitiveTemplate(params: CognitiveTemplateParams): string {
  switch (params.kind) {
    case 'coach':
      return `ЗАДАЧА: когнитивный план.
Сначала процитируй mind.mindDirective (строка [РАСЧЁТ]) из контекста без изменений.
Затем одно действие ≤15 мин с явным taskKey (mind.chess / mind.reflect.short / mind.scenario).
При cognitiveThrottle — только лёгкое; без общих советов без цифр из контекста.`;
    case 'tacticalDebrief':
      return `ЗАДАЧА: разбор решений.
Начни с mind.mindDirective [РАСЧЁТ] если есть в контексте.
Один урок из recentDecisions и один вывод с taskKey (mind.decision_log / mind.decision.followup).`;
    case 'decisionFollowUp':
      return `ЗАДАЧА: pendingDecisionFollowUps.
Процитируй [РАСЧЁТ] из mind.mindDirective. Минимальное закрытие просроченного с taskKey mind.decision.followup.`;
    default:
      return '';
  }
}
