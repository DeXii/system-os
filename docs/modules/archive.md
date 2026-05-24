# ARCHIVE

Системный meta-слой AYANAKOJI OS: конфигурация Groq / DIRECTOR, резервное копирование IndexedDB и полный архив insights.

## Секции

- **ARCHIVE Ops** — статус DIRECTOR, proxy (маскированный), счётчики записей Dexie, дата последнего insight
- **Groq / DIRECTOR Settings** — API Key, Proxy URL, Model → `localStorage` (не в экспорте)
- **Export / Import** — JSON v7, все таблицы OS (`src/core/data/export-import.ts`)
- **DIRECTOR Insights History** — архив `aiInsights` с фильтрами и повторным применением Action Cards

## Groq setup

Подробно: [AI_DIRECTOR.md](../AI_DIRECTOR.md)

1. API key: https://console.groq.com
2. Деплой `workers/groq-proxy` → Proxy URL
3. ARCHIVE → сохранить → **Проверить связь**
4. Задачи DIRECTOR — вкладка DIRECTOR или боковая панель

Ключ **не экспортируется**. После импорта на другом устройстве настройте Groq заново в ARCHIVE.

## Export / Import

| Поле | Описание |
|------|----------|
| `version` | 7 (текущая) |
| `exportedAt` | ISO timestamp |
| `operator`, `missions`, … | Массивы по таблицам Dexie |

Импорт **полностью перезаписывает** IndexedDB (с подтверждением). После импорта: `emitOsRefresh` + пересчёт readiness.

## Insights

Каждый запуск DIRECTOR сохраняет запись в `aiInsights` (+ `aiMessages`). ARCHIVE показывает до 200 последних записей, фильтры по scope / taskId / тексту.

Повторное применение actions из архива использует тот же `applyAiActions`, что и живая панель DIRECTOR.

## Связь с модулями

- Все модули при offline DIRECTOR ссылаются на ARCHIVE для настройки Groq
- DIRECTOR hub → кнопка «Настроить в ARCHIVE»
- Command Palette: `Открыть ARCHIVE`, `ARCHIVE: Экспорт данных`
