import { buildCatalogSeedBooks } from '@/content/os-books-catalog';
import { db, toLocalDateKey } from '../db';
import type { BookLevel, LibraryBook } from '../domain/types';

let librarySeedInflight: Promise<void> | null = null;

function sortBooks(a: LibraryBook, b: LibraryBook): number {
  return a.level - b.level || a.title.localeCompare(b.title);
}

export async function ensureLibrarySeeded(): Promise<void> {
  if (librarySeedInflight) return librarySeedInflight;

  const run = (async () => {
    const count = await db.libraryBooks.count();
    if (count > 0) return;
    const seed = buildCatalogSeedBooks().map((b) => ({
      ...b,
      status: 'unread' as const,
    }));
    await db.libraryBooks.bulkPut(seed);
  })();

  librarySeedInflight = run;
  try {
    await run;
  } finally {
    librarySeedInflight = null;
  }
}

export const LIBRARY_PAGE_SIZE = 50;

export type LibraryBookFilter = 'all' | 'unread' | 'read';

function matchesBookFilter(book: LibraryBook, filter: LibraryBookFilter): boolean {
  if (filter === 'unread') return book.status !== 'read';
  if (filter === 'read') return book.status === 'read';
  return true;
}

export interface LoadBooksPageParams {
  level: BookLevel | 'all';
  filter: LibraryBookFilter;
  offset: number;
  limit?: number;
}

export async function loadBooksPage(params: LoadBooksPageParams): Promise<{
  books: LibraryBook[];
  total: number;
  hasMore: boolean;
}> {
  await ensureLibrarySeeded();
  const limit = params.limit ?? LIBRARY_PAGE_SIZE;
  const query =
    params.level === 'all'
      ? db.libraryBooks.filter((b) => matchesBookFilter(b, params.filter))
      : db.libraryBooks
          .where('level')
          .equals(params.level)
          .filter((b) => matchesBookFilter(b, params.filter));

  const matched = await query.toArray();
  matched.sort(sortBooks);
  const total = matched.length;
  const books = matched.slice(params.offset, params.offset + limit);
  return {
    books,
    total,
    hasMore: params.offset + books.length < total,
  };
}

export async function getBooksByLevel(level: BookLevel): Promise<LibraryBook[]> {
  await ensureLibrarySeeded();
  return db.libraryBooks.where('level').equals(level).toArray();
}

export async function getReadingProgressByLevel(): Promise<
  Record<BookLevel, { read: number; total: number }>
> {
  await ensureLibrarySeeded();
  const all = await db.libraryBooks.toArray();
  const levels: BookLevel[] = [1, 2, 3, 4];
  const result = {} as Record<BookLevel, { read: number; total: number }>;
  for (const level of levels) {
    const books = all.filter((b) => b.level === level);
    result[level] = {
      total: books.length,
      read: books.filter((b) => b.status === 'read').length,
    };
  }
  return result;
}

export function weekStartKey(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return toLocalDateKey(d);
}

export async function getWeeklyReadingStatus(): Promise<{
  missionDone: boolean;
  booksReadThisWeek: number;
}> {
  const since = weekStartKey();
  const readThisWeek = await db.libraryBooks
    .filter((b) => b.status === 'read' && !!b.readAt && b.readAt >= since)
    .count();
  return { missionDone: readThisWeek > 0, booksReadThisWeek: readThisWeek };
}
