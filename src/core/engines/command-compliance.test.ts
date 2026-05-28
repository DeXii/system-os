import { describe, expect, it } from 'vitest';
import {
  computeCompliance,
  computeMissionWeightedPct,
  computeProtocolPct,
} from './command-compliance';
import type { Mission, ProtocolItem } from '../domain/types';

describe('command-compliance', () => {
  it('computes protocol pct', () => {
    const protocol: ProtocolItem[] = [
      { id: '1', date: '2026-01-01', label: 'a', done: true, stage: 'foundation', priority: 'routine' },
      { id: '2', date: '2026-01-01', label: 'b', done: false, stage: 'foundation', priority: 'routine' },
    ];
    expect(computeProtocolPct(protocol)).toBe(0.5);
  });

  it('weights missions by priority', () => {
    const missions: Mission[] = [
      {
        id: '1',
        date: '2026-01-01',
        title: 'c',
        stage: 'foundation',
        priority: 'critical',
        status: 'done',
      },
      {
        id: '2',
        date: '2026-01-01',
        title: 'r',
        stage: 'foundation',
        priority: 'routine',
        status: 'pending',
      },
    ];
    expect(computeMissionWeightedPct(missions)).toBeCloseTo(2 / 3, 4);
  });

  it('uses 0.4 protocol + 0.6 missions for compliance', () => {
    expect(computeCompliance(1, 1)).toBe(100);
    expect(computeCompliance(0, 0)).toBe(0);
    expect(computeCompliance(0.5, 0.5)).toBe(50);
  });
});
