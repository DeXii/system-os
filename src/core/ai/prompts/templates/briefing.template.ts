import type { BriefingTemplateParams } from '../../director/director-types';

export function renderBriefingTemplate(params: BriefingTemplateParams): string {
  switch (params.kind) {
    case 'morning':
      return `ЗАДАЧА: утренний briefing.
Один приоритет дня по currentStage и readiness. Объясни почему этот режим сейчас; что не делаем; миссии (3–5) только если оправданы fact.`;
    case 'evening':
      return `ЗАДАЧА: вечерний debrief.
Почему день прошёл так; минимальный урок; один фокус на завтра.`;
    case 'contact':
      return `ЗАДАЧА: briefing перед контактом.
Почему этот контакт сейчас; минимальный план A; что не раскрывать.`;
    default:
      return '';
  }
}
