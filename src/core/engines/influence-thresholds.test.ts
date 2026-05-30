import { describe, expect, it } from 'vitest';
import { INFLUENCE_THRESHOLDS } from './influence-thresholds';

describe('influence-thresholds', () => {
  it('throttle gates are ordered consistently', () => {
    expect(INFLUENCE_THRESHOLDS.throttleFoundationBelow).toBeGreaterThan(
      INFLUENCE_THRESHOLDS.throttleRegulationBelow
    );
    expect(INFLUENCE_THRESHOLDS.miScoreMax + INFLUENCE_THRESHOLDS.nudgeScoreMax).toBeLessThanOrEqual(
      100
    );
  });
});
