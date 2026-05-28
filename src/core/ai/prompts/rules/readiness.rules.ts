import type { OperatorAiMode } from '../../director/director-types';

export const READINESS_RULES = [
  'При низком readiness foundation/regulation — не назначай тяжёлую когнитивку и активное influence.',
  'Следуй ruleHints и constraints.flags из context.',
];

export const AI_MODE_HINTS: Record<OperatorAiMode, string> = {
  recovery: 'Режим recovery: фундамент и саморегуляция, минимум социальной/когнитивной нагрузки.',
  degraded: 'Режим degraded: сократи объём, один фокус, без амбициозных планов.',
  focus: 'Режим focus: один приоритетный блок работы, остальное — протокол.',
  tactical: 'Режим tactical: краткие решения, чёткие следующие шаги.',
  overload: 'Режим overload: deload/recovery, не наращивай нагрузку.',
};

export function mapOperatorModeToAiMode(
  mode: string,
  readiness?: { foundation: number; regulation: number }
): OperatorAiMode {
  if (readiness && (readiness.foundation < 45 || readiness.regulation < 40)) {
    return 'recovery';
  }
  if (mode === 'recover') return 'recovery';
  if (mode === 'observe') return 'degraded';
  if (mode === 'calculate') return 'focus';
  if (mode === 'influence') return 'tactical';
  return 'focus';
}
