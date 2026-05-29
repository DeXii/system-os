import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { ensureLibrarySeeded, loadBooksPage } from './library-books';

describe('ensureLibrarySeeded', () => {
  beforeEach(async () => {
    await db.open();
    await db.libraryBooks.clear();
  });

  it('runs seed only once under parallel calls', async () => {
    await Promise.all([ensureLibrarySeeded(), ensureLibrarySeeded(), ensureLibrarySeeded()]);
    const count = await db.libraryBooks.count();
    expect(count).toBeGreaterThan(0);
    const again = await db.libraryBooks.count();
    await ensureLibrarySeeded();
    expect(await db.libraryBooks.count()).toBe(again);
  });
});

describe('loadBooksPage', () => {
  beforeEach(async () => {
    await db.open();
    await db.libraryBooks.clear();
    await ensureLibrarySeeded();
  });

  it('returns globally sorted pages', async () => {
    const page0 = await loadBooksPage({ level: 'all', filter: 'all', offset: 0, limit: 3 });
    const page1 = await loadBooksPage({ level: 'all', filter: 'all', offset: 3, limit: 3 });
    const merged = [...page0.books, ...page1.books];
    for (let i = 1; i < merged.length; i++) {
      const prev = merged[i - 1]!;
      const cur = merged[i]!;
      const order = prev.level - cur.level || prev.title.localeCompare(cur.title);
      expect(order).toBeLessThanOrEqual(0);
    }
  });
});
