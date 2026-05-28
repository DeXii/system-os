import type { OutputFormatId } from '../../director/director-types';
import { OUTPUT_FORMAT_INTRO } from '../base/output-format.prompt';

const SECTION_HINTS: Record<OutputFormatId, string> = {
  commandMorning:
    'Подсекции в «Решение»: режим дня, приоритет этапа, вчерашние critical, операции, контакты, миссии.',
  commandEvening: 'Подсекции: выполнено, провалы, прогнозы, урок, завтра.',
  analysisWeekly: 'Подсекции: FOUNDATION, REGULATION, MIND, INFLUENCE, synergy/bottleneck, корректировка.',
  analysisDeep: 'Подсекции: executive summary, 4 оси, synergy/bottleneck, план (taskKey).',
  coachWorkout: 'Подсекции: режим, сессия, 3 действия, recovery.',
  coachRegulation: 'Подсекции: режим НС, HRV/дыхание, mindfulness/PST, 3 действия.',
  coachMind: 'Подсекции по задаче: когнитивный режим / debrief / follow-up.',
  coachInfluence:
    'Подсекции: режим контакта, чтение мотивов, MI/nudge, маска, дисциплина информации, 3 действия, риски.',
  coachLibrary: 'Подсекции: книга, почему сейчас, план чтения.',
  minimal: 'Структура «Решение» — по смыслу запроса, кратко.',
};

export function buildOutputFormatBlock(formatId: OutputFormatId): string {
  return `${OUTPUT_FORMAT_INTRO}\n\n${SECTION_HINTS[formatId]}`;
}
