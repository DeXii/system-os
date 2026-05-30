import { describe, expect, it } from 'vitest';
import { MIND_THRESHOLDS } from './mind-thresholds';

describe('mind-thresholds', () => {
  it('has consistent throttle and cap gates', () => {
    expect(MIND_THRESHOLDS.throttleFoundationBelow).toBe(MIND_THRESHOLDS.foundationCapBelow);
    expect(MIND_THRESHOLDS.closurePctMid).toBeLessThan(MIND_THRESHOLDS.closurePctHigh);
  });
});
