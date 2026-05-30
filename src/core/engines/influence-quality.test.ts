import { describe, expect, it } from 'vitest';
import { oarsCompleteness, outcomeTo01 } from './influence-quality';
import type { InfluenceEntry } from '../domain/types';

describe('influence-quality', () => {
  it('oarsCompleteness counts filled MI fields', () => {
    const entry: InfluenceEntry = {
      id: '1',
      date: '2026-05-01',
      type: 'mi',
      situation: 'x',
      openQuestions: 'y',
      summarize: 'z',
    };
    expect(oarsCompleteness(entry)).toBeCloseTo(0.5, 1);
  });

  it('outcomeTo01 maps text and numeric outcomes', () => {
    expect(outcomeTo01('успех')).toBe(1);
    expect(outcomeTo01('провал')).toBe(0);
    expect(outcomeTo01('4')).toBeCloseTo(0.75, 2);
    expect(outcomeTo01('')).toBeNull();
  });
});
