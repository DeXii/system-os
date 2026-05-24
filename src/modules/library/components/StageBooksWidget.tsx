import { useEffect, useState } from 'react';
import { BOOK_LEVEL_GROUPS } from '@/content/os-books-catalog';
import { getBooksByLevel } from '@/core/engines/library-books';
import type { BookLevel, LibraryBook } from '@/core/domain/types';

interface Props {
  level: BookLevel;
  onOpenLibrary?: () => void;
}

export function StageBooksWidget({ level, onOpenLibrary }: Props) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const group = BOOK_LEVEL_GROUPS.find((g) => g.level === level);

  const load = async () => {
    setBooks(await getBooksByLevel(level));
  };

  useEffect(() => {
    load();
  }, [level]);

  const read = books.filter((b) => b.status === 'read').length;
  const unread = books.filter((b) => b.status !== 'read').slice(0, 4);

  const openLibrary = () => {
    sessionStorage.setItem('library-filter-level', String(level));
    onOpenLibrary?.();
  };

  return (
    <div className="panel">
      <div className="panel-title">{group?.title ?? `Уровень ${level}`}</div>
      <p style={{ fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 8 }}>
        Прочитано {read}/{books.length}
      </p>
      {unread.map((b) => (
        <div key={b.id} className="kernel-line" style={{ fontSize: 11 }}>
          {b.title} — {b.author}
        </div>
      ))}
      <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={openLibrary}>
        Открыть библиотеку
      </button>
    </div>
  );
}
