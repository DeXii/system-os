import { computeReadiness } from './readiness';
import { shouldThrottleCognitiveLoad } from './mind-metrics';
import { shouldThrottleInfluence } from './influence-metrics';
import type { ReadinessScores } from '../domain/types';

export type OperatorModeId = 'recover' | 'observe' | 'calculate' | 'influence';

export interface OperatorMode {
  mode: OperatorModeId;
  label: string;
  rationale: string;
}

export async function computeOperatorMode(
  readiness?: ReadinessScores
): Promise<OperatorMode> {
  const r = readiness ?? (await computeReadiness());

  if (r.foundation < 45 || r.regulation < 40) {
    return {
      mode: 'recover',
      label: 'RECOVER',
      rationale: 'Низкий foundation/regulation — фундамент и маска наблюдателя.',
    };
  }

  if (shouldThrottleCognitiveLoad(r)) {
    return {
      mode: 'observe',
      label: 'OBSERVE',
      rationale: 'Throttle когнитивки — лёгкое наблюдение, без тяжёлых SWOT.',
    };
  }

  if (shouldThrottleInfluence(r)) {
    return {
      mode: 'calculate',
      label: 'CALCULATE',
      rationale: 'Социальная нагрузка ограничена — расчёт и подготовка, без активного влияния.',
    };
  }

  if (r.influence >= 55 && r.mind >= 50) {
    return {
      mode: 'influence',
      label: 'INFLUENCE',
      rationale: 'Готовность высокая — допустима тактика класса.',
    };
  }

  return {
    mode: 'calculate',
    label: 'CALCULATE',
    rationale: 'Стандартный режим — стратегия, шахматы, сценарии.',
  };
}
