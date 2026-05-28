export const EQUIPMENT_FORBIDDEN = [
  'barbell',
  'dumbbells',
  'gym machines',
  'squat rack',
  'kettlebell',
  'leg press',
  'cable machine',
];

export const EQUIPMENT_ALLOWED = ['pull-up bar', 'parallel bars', 'bodyweight'];

export const EQUIPMENT_RULES = [
  'Тренировки: только турник, брусья, bodyweight — exerciseId из foundation.allowedExerciseIds.',
  'Запрещено рекомендовать штангу, гантели, зал, тренажёры.',
  'HIFT/GPP = круг/сеты на турнике/брусьях, не зал и не CrossFit.',
];
