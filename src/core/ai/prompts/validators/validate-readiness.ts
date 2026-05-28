import type { ParsedContextSnapshot } from '../../director/director-types';

/** Flags from context.constraints — used for logging / future strict mode */
export function readinessBlocksHeavyWork(flags: ParsedContextSnapshot['flags']): boolean {
  if (!flags) return false;
  return !!(flags.cognitiveThrottle || flags.influenceThrottle || flags.lowFoundation);
}
