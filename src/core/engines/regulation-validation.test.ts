import { describe, expect, it } from 'vitest';
import { sanitizeHrvEntry, validateHrvEntry, validateStressLogEntry } from './regulation-validation';

describe('regulation-validation', () => {
  it('accepts valid HRV entry', () => {
    const r = validateHrvEntry({
      date: '2026-05-31',
      rmssd: 45,
      subjectiveReadiness: 7,
    });
    expect(r.ok).toBe(true);
  });

  it('rejects out-of-range rmssd', () => {
    const r = validateHrvEntry({ date: '2026-05-31', rmssd: 999 });
    expect(r.ok).toBe(false);
  });

  it('sanitizes HRV fields', () => {
    const s = sanitizeHrvEntry({
      date: '2026-05-31',
      rmssd: 45.7,
      subjectiveReadiness: 7,
    });
    expect(s.rmssd).toBe(46);
  });

  it('validates stress arousal range', () => {
    const bad = validateStressLogEntry({
      date: '2026-05-31',
      trigger: 'x',
      reaction: '',
      technique: '',
      outcome: '',
      arousalBefore: 11,
    });
    expect(bad.ok).toBe(false);
  });
});
