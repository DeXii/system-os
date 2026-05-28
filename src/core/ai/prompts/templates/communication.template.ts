import type { CommunicationTemplateParams } from '../../director/director-types';

export function renderCommunicationTemplate(params: CommunicationTemplateParams): string {
  switch (params.kind) {
    case 'coach':
      return `ЗАДАЧА: influence / коммуникация.
Почему сейчас этот режим контакта; минимальный ход; режим низкой заметности и дисциплина информации (energy preservation).`;
    case 'contactBrief':
      return `ЗАДАЧА: briefing перед контактом.
Почему контакт сейчас; план A/B; что удержать (приоритет наблюдения).`;
    case 'preContact':
      return `ЗАДАЧА: репетиция контакта (3–5 реплик).
Минимальная корректировка режима низкой заметности по слабым местам.`;
    case 'operationReview':
      return `ЗАДАЧА: разбор operations.active.
Почему следующий ход именно так; один приоритет.`;
    default:
      return '';
  }
}
