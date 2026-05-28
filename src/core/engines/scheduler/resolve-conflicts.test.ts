import { describe, expect, it } from 'vitest';
import { dedupeSlotsByTaskKey } from './resolve-conflicts';
import type { ScheduleSlot } from '../../domain/types';

describe('scheduler resolve-conflicts', () => {
  it('dedupes by taskKey keeping lowest rank', () => {
    const slots: ScheduleSlot[] = [
      {
        id: '2',
        taskKey: 'foundation.workout',
        type: 'workout',
        title: 'b',
        rank: 200,
        priority: 'routine',
      },
      {
        id: '1',
        taskKey: 'foundation.workout',
        type: 'workout',
        title: 'a',
        rank: 100,
        priority: 'routine',
      },
    ];
    const out = dedupeSlotsByTaskKey(slots);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('1');
  });
});
