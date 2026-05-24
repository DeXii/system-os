import type { StageId } from '@/core/domain/types';

export interface StageInfo {
  id: StageId;
  number: number;
  name: string;
  goal: string;
  methods: string;
  result: string;
}

export const STAGES: StageInfo[] = [
  {
    id: 'foundation',
    number: 1,
    name: 'Физиологический фундамент',
    goal: 'Создание устойчивого тела и разума.',
    methods: 'GPP (HIFT, ACFT); recovery; осознанные стресс-тренировки.',
    result: 'Хладнокровие и ясность ума в стрессе.',
  },
  {
    id: 'regulation',
    number: 2,
    name: 'Ядро саморегуляции',
    goal: 'Эмоциональный контроль и хладнокровие.',
    methods: 'Резонансное дыхание; mindfulness/MMFT; PST; HRV.',
    result: 'Контроль физиологического и психологического состояния.',
  },
  {
    id: 'mind',
    number: 3,
    name: 'Оружие мышления',
    goal: 'Стратегический анализ и принятие решений.',
    methods: 'Шахматы/Go; стратегическое прогнозирование; метапознание.',
    result: 'Видение большой картины и предвидение последствий.',
  },
  {
    id: 'influence',
    number: 4,
    name: 'Тактика влияния',
    goal: 'Этичные механизмы социального воздействия.',
    methods: 'MI; Nudge Theory; эмпатия; Theory of Mind.',
    result: 'Влияние с внутренней гармонией и этикой.',
  },
];

export const PYRAMID_LEVELS = [
  {
    level: 1,
    name: 'Физическая и эмоциональная стабильность',
    modules: ['foundation', 'regulation'],
  },
  {
    level: 2,
    name: 'Когнитивная и стратегическая мощь',
    modules: ['mind'],
  },
  {
    level: 3,
    name: 'Социальное влияние',
    modules: ['influence'],
  },
];
