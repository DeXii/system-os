import { describe, expect, it } from 'vitest';
import { EXPORT_VERSION, validateImportPayload } from './export-import';

describe('export-import', () => {
  it('accepts domainEvents and dbMeta tables', () => {
    const payload = {
      version: EXPORT_VERSION,
      domainEvents: [{ id: '1', type: 'DAY_BOOTSTRAPPED', timestamp: '2026-01-01', payload: { date: '2026-01-01' } }],
      dbMeta: [],
    };
    const r = validateImportPayload(payload);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.version).toBe(EXPORT_VERSION);
  });
});
