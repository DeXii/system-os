# LIBRARY Module

Dock tab `library` — каталог книг четырёх уровней OS + еженедельное чтение. Не привязан к одному этапу пирамиды.

## Компоненты

| Компонент | Назначение |
|-----------|------------|
| `LibraryModule` | Каталог, фильтры, прогресс по уровням, отметка «прочитано» |
| `StageBooksWidget` | В FOUNDATION / REGULATION / MIND / INFLUENCE — только книги своего уровня (1–4) |

## Data

| Table | Purpose |
|-------|---------|
| `libraryBooks` | Каталог (seed + пользовательские книги) |

Seed: `ensureLibrarySeeded()` из [`os-books-catalog.ts`](../../src/content/os-books-catalog.ts). Пагинация: `library-books.ts`.

## taskKey

- `os.reading.weekly` — еженедельная миссия чтения (генерируется в bootstrap)

## Kernel

- `afterBookMarkedRead` — отметка прочитанной книги → завершение `os.reading.weekly` при выполнении условий

## Readiness

Weekly reading bonus учитывается в **mind** readiness (`mind-readiness.ts`), не отдельной осью.

## DIRECTOR

- `libraryCoach` — рекомендации по чтению и фокусу уровня
- Context slices: `library.*` в manifest

## Export

Snapshot **v17** включает `libraryBooks`.
