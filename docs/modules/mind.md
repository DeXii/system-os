# MIND Module

Этап 3: Chess/Go журнал, SWOT/сценарии, метапознание (PMR + OODA), decision log, DIRECTOR.

## Компоненты

| Компонент | Назначение |
|-----------|------------|
| `ChessGoJournalPanel` | Журнал сессии: игра, минуты, рейтинг, платформа |
| `ChessGoHistory` | История + график рейтинга 30 дней |
| `SwotScenarioPanel` | S/W/O/T, сценарии текстом, решение, DIRECTOR SWOT review |
| `MetacognitionPanel` | PMR (short/extended) или OODA |
| `DecisionLogPanel` | Журнал решений + follow-up |
| `StudyLogPanel` | Учёба вне chess/go |
| `MindOpsSummary` | Сводка 7d + `buildMindDirective()` |
| `MindDirectorPanel` | mindCoach, tacticalDebrief, freeCommand |
| `StageBooksWidget` | Книги уровня 3 → вкладка LIBRARY |

## taskKey

- `mind.chess` — журнал chess/go
- `mind.reflect.short` — ежедневный короткий PMR/OODA
- `mind.reflect.extended` — расширенный по событию
- `mind.reflect` — legacy alias
- `mind.scenario` — SWOT/сценарий
- `mind.decision_log` — decision log
- `mind.decision.followup` — авто-миссия +7д после decision log
- `mind.study` — study session (вне chess)
- `os.reading.weekly` — еженедельное чтение (глобально)

## os-kernel

`afterChessGoComplete`, `afterReflectionComplete`, `afterScenarioComplete`, `afterDecisionLogComplete` (ставит `followUpDueDate`), `afterStudySessionComplete`, `completeMindPractice`.

## Библиотека

Полный каталог — вкладка **LIBRARY** в Dock. В MIND — виджет уровня 3.

## Readiness v2

Chess minutes + reflect + scenario/decision + weekly reading bonus. Мягкий cap при низком foundation/regulation. Логика в `mind-readiness.ts`, пороги в `mind-thresholds.ts`.

## Адаптивные параметры

`OperatorMindParams` (`mind-params.ts`): EMA дозы chess, рейтинг z-score, калибровка решений (Beta), peak hour, swot tolerance. Обновление в `after-mind.ts`.

## Mind Directive

`buildMindDirective()` в `mind-metrics.ts` — `[РАСЧЁТ] · [ДЕЙСТВИЕ] · [ОТКАЗ]` в MindOpsSummary и контексте DIRECTOR (`mind.mindDirective`).

## Decision follow-up

`decision-followup.ts` — генерация миссии `mind.decision.followup` при наступлении `followUpDueDate`.

## Export

Snapshot **v17** включает `decisionLogs`, `studySessions`, `operatorMindParams`.
