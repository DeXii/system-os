import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedContextJson } from './context-cache';

vi.mock('../db/write', () => ({
  getGlobalRevision: vi.fn(async () => 1),
}));

describe('getCachedContextJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dedupes concurrent builds for the same key', async () => {
    let calls = 0;
    const builder = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return '{"ok":true}';
    };

    const [a, b] = await Promise.all([
      getCachedContextJson('test-key', builder),
      getCachedContextJson('test-key', builder),
    ]);

    expect(a).toBe(b);
    expect(calls).toBe(1);
  });
});
