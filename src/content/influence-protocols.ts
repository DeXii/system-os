export const TACTICAL_PROTOCOL_ITEMS = [
  'Оператор: прочитаны мотивы и эмоциональное состояние собеседника',
  'Контроль собственных сигналов (лицо, тон, паузы)',
  'Цель контакта сформулирована; намерение не раскрыто преждевременно',
  'План B и точка выхода определены',
] as const;

export const OARS_FIELD_HINTS = {
  situation: 'Ситуация / контекст контакта (кто, где, ставка)',
  openQuestions: 'Open questions — вопросы без подталкивания к ответу',
  affirmReflect: 'Affirm + Reflect — отражение и подкрепление сказанного',
  summarize: 'Summarize — сводка позиции собеседника своими словами',
  whatWorked: 'Что сработало в тактике класса',
  outcome: 'Исход контакта (факт, не оценка)',
};

export const NUDGE_TYPES = [
  { id: 'default', label: 'Default option' },
  { id: 'opt_out', label: 'Opt-out / opt-in' },
  { id: 'social_proof', label: 'Social proof' },
  { id: 'framing', label: 'Framing' },
  { id: 'timing', label: 'Timing / salience' },
] as const;

export const COGNITIVE_BIAS_CATALOG = [
  'Подтверждение (confirmation bias)',
  'Якорение',
  'Эффект ореола',
  'Planning fallacy',
  'Sunk cost',
  'Fundamental attribution error',
  'Availability heuristic',
];

export const OBSERVATION_TYPES = [
  { id: 'observation', label: 'Наблюдение / Theory of Mind' },
  { id: 'debrief', label: 'Debrief после контакта' },
] as const;
