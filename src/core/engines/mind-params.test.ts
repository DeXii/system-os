import { describe, expect, it } from 'vitest';
import { getRatingZScore } from './mind-params';
import type { OperatorMindParams } from '../domain/types';

describe('mind-params', () => {
  it('computes rating z-score from EMA', () => {
    const params: OperatorMindParams = {
      id: 'mind-params',
      chessDoseTargetMin: 30,
      reflectEfficacy: 0.5,
      decisionCalibration: 0.5,
      swotTolerance: 0.5,
      ratingEma: 1500,
      ratingSigmaEma: 100,
      lastUpdated: new Date().toISOString(),
    };
    const z = getRatingZScore(1600, params);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(0);
  });
});
