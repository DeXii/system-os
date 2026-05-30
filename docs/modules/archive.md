# ARCHIVE

Системный meta-слой AYANAKOJI OS: конфигурация Groq / DIRECTOR, резервное копирование IndexedDB, cloud sync, domain events, полный архив insights.

## Секции

| Компонент | Назначение |
|-----------|------------|
| `ArchiveOpsSummary` | Статус DIRECTOR, proxy (маскированный), счётчики Dexie |
| Groq / DIRECTOR Settings | API Key, Proxy URL, Model → `localStorage` (не в экспорте) |
| `ExportImportPanel` | JSON snapshot export/import |
| `CloudSyncPanel` | Firebase snapshot (без `domainEvents`) |
| `DomainEventsPanel` | Просмотр / ручной prune domain events |
| Insights History | `aiInsights` (до 200), повторное применение Action Cards |
| `SystemResetPanel` | Factory reset |

## Groq setup

Подробно: [AI_DIRECTOR.md](../AI_DIRECTOR.md)

1. API key: https://console.groq.com (секрет на Cloudflare Worker)
2. Деплой `workers/groq-proxy` → Proxy URL в `.env` / GitHub secrets
3. ARCHIVE → сохранить → **Проверить связь** (`/health`)
4. Задачи DIRECTOR — вкладка DIRECTOR, PROMPT (preview) или боковая панель

Ключ Groq **не экспортируется**. После импорта на другом устройстве настройте Groq заново в ARCHIVE.

## Export / Import

| Поле | Описание |
|------|----------|
| `version` | **17** (текущая) — [`EXPORT_VERSION`](../../src/core/data/export-import.ts) |
| `exportedAt` | ISO timestamp |
| `operator`, `missions`, … | Массивы по `EXPORT_TABLE_KEYS` |

Полный список таблиц: `operator`, `dailyLogs`, `bftEvents`, `setLogs`, nutrition tables, `operator*Params`, `contacts`, `operations`, `domainEvents`, `glossaryCache`, … (см. код).

Импорт **полностью перезаписывает** IndexedDB (с подтверждением). UI предупреждает, если версия файла < 17. После импорта: `emitOsRefresh` + пересчёт readiness.

Legacy: `acftEvents` в экспорте для совместимости старых backup; активный тест — **BFT**.

## Cloud sync

Firestore snapshot использует `CLOUD_SYNC_TABLE_KEYS` — те же таблицы, что export, **кроме** `domainEvents` (локальный журнал).

## Domain events retention

- Хранение: **30 дней** ([`domain-events-retention.ts`](../../src/core/events/domain-events-retention.ts))
- Авто-prune: debounced после emit
- Ручной prune: ARCHIVE → Domain Events

## Insights

Каждый запуск DIRECTOR сохраняет запись в `aiInsights` (+ `aiMessages`). ARCHIVE показывает до 200 последних записей, фильтры по scope / taskId / тексту.

Повторное применение actions из архива: `applyDirectorActions` (тот же путь, что живая панель).

## Связь с модулями

- Все модули при offline DIRECTOR ссылаются на ARCHIVE для настройки Groq
- DIRECTOR hub → кнопка «Настроить в ARCHIVE»
- Command Palette: `Открыть ARCHIVE`, `ARCHIVE: Экспорт данных`
