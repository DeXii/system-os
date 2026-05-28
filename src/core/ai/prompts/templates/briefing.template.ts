import type { BriefingTemplateParams } from '../../director/director-types';

export function renderBriefingTemplate(params: BriefingTemplateParams): string {
  switch (params.kind) {
    case 'morning':
      return `ЗАДАЧА: утренний briefing (MORNING).
Приоритет у operator.currentStage; охвати 4 этапа без перегруза.
По каждой critical из yesterdayPendingMissions — перенос (add_mission) или закрытие с обоснованием.
Не назначай mind/influence при degraded foundation/regulation.
В «Решение»: режим дня, приоритет этапа, вчерашние critical, pendingDecisionFollowUps, operations, contacts, миссии (3–5).`;
    case 'evening':
      return `ЗАДАЧА: вечерний debrief.
Данные: operations, mind.pendingDecisionFollowUps, compliance.
В «Решение»: выполнено, провалы, закрытие прогнозов, урок дня, завтра (1 фокус).`;
    case 'contact':
      return `ЗАДАЧА: briefing перед контактом (influence.contacts).
В «Решение»: досье, мотивы, план A/B, что не раскрывать (границы), 3 действия.`;
    default:
      return '';
  }
}
