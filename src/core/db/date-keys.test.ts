import { describe, expect, it } from 'vitest';
import { dateKeyDaysAgo, todayKey, toLocalDateKey } from './index';

describe('local date keys', () => {
  it('toLocalDateKey uses calendar date in local timezone', () => {
    expect(toLocalDateKey(new Date(2025, 4, 29, 1, 30, 0))).toBe('2025-05-29');
    expect(toLocalDateKey(new Date(2025, 0, 5, 23, 59, 0))).toBe('2025-01-05');
  });

  it('todayKey matches toLocalDateKey', () => {
    const d = new Date(2025, 0, 15, 23, 0, 0);
    expect(todayKey(d)).toBe(toLocalDateKey(d));
  });

  it('dateKeyDaysAgo steps local calendar days', () => {
    const base = new Date();
    const expected = new Date(base);
    expected.setDate(expected.getDate() - 3);
    expect(dateKeyDaysAgo(3)).toBe(toLocalDateKey(expected));
  });
});
