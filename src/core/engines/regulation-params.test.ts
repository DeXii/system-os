import { describe, expect, it } from 'vitest';
import { REGULATION_THRESHOLDS } from './regulation-thresholds';

describe('regulation-params thresholds', () => {
  it('has consistent z-score gates', () => {
    expect(REGULATION_THRESHOLDS.hrvZHardDeny).toBeLessThan(REGULATION_THRESHOLDS.hrvZBelow);
    expect(REGULATION_THRESHOLDS.hrvZBelow).toBeLessThanOrEqual(REGULATION_THRESHOLDS.hrvZRecovery);
  });
});
