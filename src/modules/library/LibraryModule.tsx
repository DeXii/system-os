import { useCallback, useRef, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import { BOOK_LEVEL_GROUPS } from '@/content/os-books-catalog';
import { db, uid } from '@/core/db';
import { afterBookMarkedRead } from '@/core/engines/os-kernel';
import {
  ensureLibrarySeeded,
  getReadingProgressByLevel,
  loadBooksPage,
} from '@/core/engines/library-books';
import { applyAiActions, runDirectorTask } from '@/core/ai/director-service';
import type { AiInsight } from '@/core/domain/types';
import { useDirectorStatus } from '@/hooks/useDirectorStatus';
import type { BookLevel, BookReadStatus, LibraryBook } from '@/core/domain/types';
import { ModuleShell } from '@/ui/shell/ModuleShell';
import { TerminalBlock } from '@/ui/components/TerminalBlock';

interface Props {
  onRefresh: () => void;
}

type Filter = 'all' | 'unread' | 'read';

export function LibraryModule({ onRefresh }: Props) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [booksTotal, setBooksTotal] = useState(0);
  const [hasMoreBooks, setHasMoreBooks] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bookOffsetRef = useRef(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [levelFilter, setLevelFilter] = useState<BookLevel | 'all'>('all');
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof getReadingProgressByLevel>> | null>(
    null
  );
  const [chaptersInput, setChaptersInput] = useState<Record<string, string>>({});
  const [addForm, setAddForm] = useState({
    level: 1 as BookLevel,
    title: '',
    author: '',
    tags: '',
    description: '',
  });
  const [directorOut, setDirectorOut] = useState('');
  const [coachInsight, setCoachInsight] = useState<AiInsight | null>(null);
  const [loadingDirector, setLoadingDirector] = useState(false);
  const directorStatus = useDirectorStatus();

  const load = useCallback(
    async (append = false) => {
      await ensureLibrarySeeded();
      const stored = sessionStorage.getItem('library-filter-level');
      let level = levelFilter;
      if (stored) {
        level = Number(stored) as BookLevel;
        setLevelFilter(level);
        sessionStorage.removeItem('library-filter-level');
      }
      const offset = append ? bookOffsetRef.current : 0;
      const page = await loadBooksPage({ level, filter, offset });
      setBooks((prev) => (append ? [...prev, ...page.books] : page.books));
      bookOffsetRef.current = offset + page.books.length;
      setBooksTotal(page.total);
      setHasMoreBooks(page.hasMore);
      if (!append) setProgress(await getReadingProgressByLevel());
    },
    [filter, levelFilter]
  );

  const loadMore = useCallback(async () => {
    if (!hasMoreBooks || loadingMore) return;
    setLoadingMore(true);
    try {
      await load(true);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreBooks, loadingMore, load]);

  useAsyncEffect(
    async (signal) => {
      await load();
      if (signal.aborted) return;
    },
    [load]
  );

  const setStatus = async (book: LibraryBook, status: BookReadStatus) => {
    if (status === 'read') {
      await afterBookMarkedRead(book.id, chaptersInput[book.id]);
    } else {
      await db.libraryBooks.update(book.id, { status, readAt: undefined });
    }
    load();
    onRefresh();
  };

  const addBook = async () => {
    if (!addForm.title.trim()) return;
    await db.libraryBooks.add({
      id: uid(),
      level: addForm.level,
      title: addForm.title,
      author: addForm.author,
      tags: addForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      description: addForm.description,
      source: 'user',
      status: 'unread',
    });
    setAddForm({ level: 1, title: '', author: '', tags: '', description: '' });
    load();
  };

  const libraryCoach = async () => {
    if (directorStatus !== 'online') {
      setDirectorOut('DIRECTOR offline — настройте в ARCHIVE');
      return;
    }
    setLoadingDirector(true);
    setCoachInsight(null);
    const res = await runDirectorTask('libraryCoach', { scope: 'library' });
    setLoadingDirector(false);
    if (!res.ok) {
      setDirectorOut(res.error);
      return;
    }
    setCoachInsight(res.insight);
    const actionHint =
      res.insight.actions.length > 0
        ? `\n\n[${res.insight.actions.length} действий — примените вручную]`
        : '';
    setDirectorOut(res.insight.text + actionHint);
  };

  const applyCoachActions = async () => {
    if (!coachInsight?.actions.length) return;
    setLoadingDirector(true);
    try {
      const { applied, dropped } = await applyAiActions(coachInsight.actions);
      setDirectorOut(
        (o) =>
          o +
          `\n\n[Применено: ${applied}${dropped ? `, отброшено: ${dropped}` : ''}]`
      );
      setCoachInsight(null);
      onRefresh();
    } finally {
      setLoadingDirector(false);
    }
  };

  return (
    <div>
      <ModuleShell title="LIBRARY" subtitle="READING OPS · 4 LEVELS" />

      {progress && (
        <div className="panel">
          <div className="panel-title">Прогресс по уровням</div>
          <div className="grid-2" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
            {([1, 2, 3, 4] as BookLevel[]).map((l) => (
              <div key={l}>
                L{l}: {progress[l].read}/{progress[l].total}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {(['all', 'unread', 'read'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Все' : f === 'unread' ? 'Непрочитанные' : 'Прочитанные'}
            </button>
          ))}
          <select
            className="select"
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as BookLevel))
            }
          >
            <option value="all">Все уровни</option>
            {BOOK_LEVEL_GROUPS.map((g) => (
              <option key={g.level} value={g.level}>
                Уровень {g.level}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" disabled={loadingDirector} onClick={libraryCoach}>
            DIRECTOR: книга недели
          </button>
        </div>
        {directorOut && <TerminalBlock>{directorOut}</TerminalBlock>}
        {coachInsight && coachInsight.actions.length > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ marginTop: 8 }}
            disabled={loadingDirector}
            onClick={() => void applyCoachActions()}
          >
            Применить действия DIRECTOR ({coachInsight.actions.length})
          </button>
        )}
      </div>

      {BOOK_LEVEL_GROUPS.map((group) => {
        const levelBooks = books.filter((b) => b.level === group.level);
        if (levelFilter !== 'all' && levelFilter !== group.level) return null;
        if (!levelBooks.length && levelFilter === 'all') return null;
        return (
          <details key={group.level} className="panel" open={levelFilter === group.level}>
            <summary className="panel-title" style={{ cursor: 'pointer' }}>
              {group.title} ({levelBooks.length})
            </summary>
            {levelBooks.map((book) => (
              <div
                key={book.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  padding: '8px 0',
                  opacity: book.status === 'read' ? 0.65 : 1,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{book.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {book.author}
                  {book.tags.length ? ` · ${book.tags.join(', ')}` : ''}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0' }}>
                  {book.description}
                </p>
                {book.status !== 'read' && (
                  <input
                    className="input"
                    placeholder="Главы (гл. 1–3)"
                    style={{ marginBottom: 4, fontSize: 11 }}
                    value={chaptersInput[book.id] ?? ''}
                    onChange={(e) =>
                      setChaptersInput((c) => ({ ...c, [book.id]: e.target.value }))
                    }
                  />
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  {book.status !== 'read' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setStatus(book, 'reading')}
                      >
                        Читаю
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setStatus(book, 'read')}
                      >
                        Прочитано
                      </button>
                    </>
                  )}
                  {book.status === 'read' && (
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>
                      ✓ {book.readAt}
                      {book.chaptersRead ? ` · ${book.chaptersRead}` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </details>
        );
      })}

      <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '4px 0 8px' }}>
        Показано {books.length} из {booksTotal}
      </p>
      {hasMoreBooks && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginBottom: 12 }}
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Загрузка…' : 'Ещё книги'}
        </button>
      )}

      <div className="panel">
        <div className="panel-title">Добавить книгу</div>
        <div className="form-row">
          <label className="label">Уровень</label>
          <select
            className="select"
            value={addForm.level}
            onChange={(e) => setAddForm({ ...addForm, level: Number(e.target.value) as BookLevel })}
          >
            {BOOK_LEVEL_GROUPS.map((g) => (
              <option key={g.level} value={g.level}>
                {g.level}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="label">Название</label>
          <input
            className="input"
            value={addForm.title}
            onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Автор</label>
          <input
            className="input"
            value={addForm.author}
            onChange={(e) => setAddForm({ ...addForm, author: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Теги (через запятую)</label>
          <input
            className="input"
            value={addForm.tags}
            onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Описание</label>
          <textarea
            className="textarea"
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={addBook}>
          Добавить
        </button>
      </div>
    </div>
  );
}
