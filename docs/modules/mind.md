# MIND Module

Этап 3: Chess/Go журнал, SWOT/сценарии, метапознание (PMR + OODA), decision log, DIRECTOR.

## Компоненты

| Компонент | Назначение |
|-----------|------------|
| `ChessGoJournalPanel` | Журнал сессии: игра, минуты, рейтинг, платформа |
| `ChessGoHistory` | История + график рейтинга 30 дней |
| `SwotScenarioPanel` | S/W/O/T, сценарии текстом, решение, DIRECTOR SWOT review |
| `MetacognitionPanel` | PMR (short/extended) или OODA |
| `DecisionLogPanel` | Журнал решений |
| `MindOpsSummary` | Сводка 7d + COMMAND hints |
| `MindDirectorPanel` | mindCoach, tacticalDebrief, freeCommand |
| `StageBooksWidget` | Книги уровня 3 → вкладка LIBRARY |

## taskKey

- `mind.chess` — журнал chess/go
- `mind.reflect.short` — ежедневный короткий PMR/OODA
- `mind.reflect.extended` — расширенный по событию
- `mind.reflect` — legacy alias
- `mind.scenario` — SWOT/сценарий
- `mind.decision_log` — decision log
- `os.reading.weekly` — еженедельное чтение (глобально)

## os-kernel

`afterChessGoComplete`, `afterReflectionComplete`, `afterScenarioComplete`, `afterDecisionLogComplete`, `completeMindPractice`.

## Библиотека

Полный каталог — вкладка **LIBRARY** в Dock. В MIND — виджет уровня 3.

## Readiness v2

Chess minutes + reflect + scenario/decision + weekly reading bonus. Мягкий cap при низком foundation/regulation.
