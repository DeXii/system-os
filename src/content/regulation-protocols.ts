import type { BreathingMode } from '@/core/domain/types';

export interface ResonantPreset {
  id: string;
  label: string;
  breathsPerMin: number;
  inhaleSec: number;
  exhaleSec: number;
  defaultDurationMin: number;
}

export interface WimHofPreset {
  id: string;
  label: string;
  rounds: number;
  powerBreaths: number;
  recoverySec: number;
}

export interface MindfulnessPreset {
  id: string;
  label: string;
  type: string;
  durationMin: number;
}

export const RESONANT_PRESETS: ResonantPreset[] = [
  { id: 'r55', label: '5.5 BPM (классика)', breathsPerMin: 5.5, inhaleSec: 5.5, exhaleSec: 5.5, defaultDurationMin: 10 },
  { id: 'r60', label: '6 BPM', breathsPerMin: 6, inhaleSec: 5, exhaleSec: 5, defaultDurationMin: 10 },
];

export const WIMHOF_PRESETS: WimHofPreset[] = [
  { id: 'wh_beginner', label: 'Beginner 3×30', rounds: 3, powerBreaths: 30, recoverySec: 15 },
  { id: 'wh_standard', label: 'Standard 4×40', rounds: 4, powerBreaths: 40, recoverySec: 15 },
];

export const MINDFULNESS_PRESETS: MindfulnessPreset[] = [
  { id: 'mmft', label: 'MMFT', type: 'MMFT', durationMin: 10 },
  { id: 'body_scan', label: 'Body scan', type: 'body_scan', durationMin: 15 },
  { id: 'focus', label: 'Focused attention', type: 'focus', durationMin: 10 },
];

export const PST_TEMPLATES: string[] = [
  'Это временная реакция, не факт о мире.',
  'Я могу снизить arousal до принятия решения.',
  'Что бы я сказал другу в этой ситуации?',
  'Одно действие в зоне контроля прямо сейчас.',
];

export const WIMHOF_DISCLAIMER =
  'Wim Hof — интенсивная практика. Не выполняйте в воде, за рулём, при беременности, сердечно-сосудистых заболеваниях без консультации врача. Прекращайте при головокружении или боли.';

export function modeLabel(mode: BreathingMode): string {
  const map: Record<BreathingMode, string> = {
    resonant: 'Резонанс',
    wim_hof: 'Wim Hof',
    box: 'Box',
    custom: 'Custom',
  };
  return map[mode] ?? mode;
}
