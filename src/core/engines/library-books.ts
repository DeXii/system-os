import { buildCatalogSeedBooks } from '@/content/os-books-catalog';
import { db } from '../db';
import type { BookLevel, LibraryBook } from '../domain/types';

export async function ensureLibrarySeeded(): Promise<void> {
  const count = await db.libraryBooks.count();
  if (count > 0) return;
  const seed = buildCatalogSeedBooks().map((b) => ({
    ...b,
    status: 'unread' as const,
  }));
  await db.libraryBooks.bulkAdd(seed);
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
  return d.toISOString().split('T')[0];
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
