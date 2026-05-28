import type { OutputFormatId } from '../../director/director-types';
import { OUTPUT_FORMAT_INTRO } from '../base/output-format.prompt';

const SECTION_HINTS: Record<OutputFormatId, string> = {
  commandMorning: 'Фокус: режим дня, один приоритет этапа, миссии только по fact.',
  commandEvening: 'Фокус: урок дня, один фокус на завтра.',
  analysisWeekly: 'Фокус: bottleneck и одна корректировка недели.',
  analysisDeep: 'Фокус: executive summary и план на 7–14 дней (taskKey).',
  coachWorkout: 'Фокус: один план сессии; action set_workout_plan если требуется.',
  coachRegulation: 'Фокус: режим НС и один протокол дня.',
  coachMind: 'Фокус: один когнитивный блок без перегруза.',
  coachInfluence: 'Фокус: режим контакта, низкая заметность, 3 точечных действия.',
  coachLibrary: 'Фокус: одна книга и план чтения.',
  minimal: 'Кратко по запросу оператора.',
};

export function buildOutputFormatBlock(formatId: OutputFormatId): string {
  return `${OUTPUT_FORMAT_INTRO}\n\n${SECTION_HINTS[formatId]}`;
}
