import { describe, expect, it } from 'vitest';
import { sessionPerformanceFromLogs } from './training-params';
import type { SetLog } from '../domain/types';

describe('training-params', () => {
  it('sessionPerformanceFromLogs averages actual/target', () => {
    const logs: SetLog[] = [
      {
        id: '1',
        date: '2026-05-01',
        exerciseId: 'hift_pullup',
        workoutPlanId: 'p1',
        setIndex: 0,
        targetReps: 10,
        actualReps: 10,
        restSec: 90,
      },
      {
        id: '2',
        date: '2026-05-01',
        exerciseId: 'hift_pullup',
        workoutPlanId: 'p1',
        setIndex: 1,
        targetReps: 10,
        actualReps: 8,
        restSec: 90,
      },
    ];
    const perf = sessionPerformanceFromLogs(logs);
    expect(perf).toBeGreaterThan(0.8);
    expect(perf).toBeLessThan(1);
  });
});
