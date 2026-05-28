import type { OperatorAiMode } from '../../director/director-types';

export const READINESS_RULES = [
  'Следуй ruleHints и constraints.flags из context.',
];

export const AI_MODE_HINTS: Record<OperatorAiMode, string> = {
  recovery: 'recovery: фундамент и саморегуляция, минимум нагрузки.',
  degraded: 'degraded: один фокус, без амбициозных планов.',
  focus: 'focus: один приоритетный блок, остальное — протокол.',
  tactical: 'tactical: кратко, следующий шаг.',
  overload: 'overload: deload/recovery, не наращивай нагрузку.',
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
