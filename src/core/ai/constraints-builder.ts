import type { ReadinessScores } from '../domain/types';
import type { OperatorMode } from '../engines/operator-mode';
import { shouldThrottleCognitiveLoad } from '../engines/mind-metrics';
import { shouldThrottleInfluence } from '../engines/influence-metrics';
import type { OperatorAiMode } from './director/director-types';
import { AI_MODE_HINTS, mapOperatorModeToAiMode } from './prompts/rules/readiness.rules';

export interface ContextConstraints {
  active: string[];
  flags: Record<string, boolean>;
  aiMode: OperatorAiMode;
  aiModeHints: string[];
}

export function buildContextConstraints(
  readiness: ReadinessScores,
  operatorMode: OperatorMode,
  options?: {
    cognitiveThrottle?: boolean;
    influenceThrottle?: boolean;
  }
): ContextConstraints {
  const cognitiveThrottle = options?.cognitiveThrottle ?? shouldThrottleCognitiveLoad(readiness);
  const influenceThrottle = options?.influenceThrottle ?? shouldThrottleInfluence(readiness);

  const flags: Record<string, boolean> = {
    wimHofBlocked:
      readiness.foundation < 45 || readiness.regulation < 40,
    cognitiveThrottle,
    influenceThrottle,
    lowFoundation: readiness.foundation < 45,
    lowRegulation: readiness.regulation < 40,
  };

  const active: string[] = [];
  if (flags.lowFoundation) active.push('readiness.lowFoundation');
  if (flags.lowRegulation) active.push('readiness.lowRegulation');
  if (flags.wimHofBlocked) active.push('regulation.wimHofBlocked');
  if (flags.cognitiveThrottle) active.push('mind.cognitiveThrottle');
  if (flags.influenceThrottle) active.push('influence.throttle');

  const aiMode = mapOperatorModeToAiMode(operatorMode.mode, readiness);
  const aiModeHints = [AI_MODE_HINTS[aiMode], operatorMode.rationale].filter(Boolean);

  return { active, flags, aiMode, aiModeHints };
}

export function getAiModeHintForPrompt(constraints: ContextConstraints): string {
  return constraints.aiModeHints.join(' ');
}
