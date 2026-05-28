import type { CommunicationTemplateParams } from '../../director/director-types';

export function renderCommunicationTemplate(params: CommunicationTemplateParams): string {
  switch (params.kind) {
    case 'coach':
      return `ЗАДАЧА: тактика влияния оператора (холодный аналитический тон, «тактика класса»).
Данные: influence.ops7d, contacts, throttle, operations, readiness.
Фокус: контроль ситуации, чтение мотивов, маска, сокрытие намерений до момента X, дисциплина информации, план B.
В «Решение»: режим контакта, чтение собеседника (досье), MI/nudge план, маска и дисциплина информации, 3 действия, риски.`;
    case 'contactBrief':
      return `ЗАДАЧА: briefing перед контактом (influence.contacts).
Укажи: мотивы, ставки, слабые места, disclosureNotes, маска, план A/B, запретные темы.
В «Решение»: досье, чтение мотивов, план A / план B, не раскрывать, 3 действия.`;
    case 'preContact':
      return `ЗАДАЧА: репетиция контакта (симуляция диалога).
Используй influence.contacts и operations.active. Пройди 3–5 реплик: оператор → собеседник → контрход.
В «Решение»: сценарий контакта, симуляция (реплики), слабые места оператора, корректировка маски.`;
    case 'operationReview':
      return `ЗАДАЧА: разбор operations.active.
В «Решение»: статус операции, следующий ход, риски, 3 действия (taskKey).`;
    default:
      return '';
  }
}
