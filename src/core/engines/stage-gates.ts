import type { ModuleId, ModuleStatus, ReadinessScores } from '../domain/types';

const DEGRADED_THRESHOLD = 40;

export function getModuleStatuses(readiness: ReadinessScores): Record<ModuleId, ModuleStatus> {
  const foundationWeak = readiness.foundation < DEGRADED_THRESHOLD;
  const regulationWeak = readiness.regulation < DEGRADED_THRESHOLD;

  return {
    command: 'active',
    director: 'active',
    archive: 'active',
    integration: 'active',
    foundation: foundationWeak ? 'degraded' : 'active',
    regulation: regulationWeak ? 'degraded' : 'active',
    mind: foundationWeak || regulationWeak ? 'degraded' : 'active',
    influence:
      foundationWeak || regulationWeak || readiness.mind < DEGRADED_THRESHOLD
        ? 'degraded'
        : 'active',
    library: 'active',
  };
}

export function getDegradedMessage(module: ModuleId): string | null {
  const messages: Partial<Record<ModuleId, string>> = {
    mind: 'MIND в degraded mode: укрепите FOUNDATION и REGULATION перед глубокой стратегией.',
    influence:
      'INFLUENCE в degraded mode: требуется стабильный фундамент и саморегуляция.',
    foundation: 'FOUNDATION требует внимания — это база всей системы.',
    regulation: 'REGULATION просел — HRV и дыхание в приоритете.',
  };
  return messages[module] ?? null;
}
