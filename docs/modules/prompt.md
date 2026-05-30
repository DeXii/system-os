# PROMPT Module

Dock tab `prompt` — инспекция system prompt и context JSON **без** вызова Groq API.

## Назначение

Отладка DIRECTOR pipeline: увидеть итоговый system prompt (BASE + RULES + TEMPLATE + …) и user JSON (context slices) до отправки в worker.

| Режим | Поведение |
|-------|-----------|
| **Preview** | `buildDisplayPromptParts` — сборка без API |
| **Run** | полный `buildDirectorPromptBundle` + Groq (как DIRECTOR) |

Реализация: [`PromptModule.tsx`](../../src/modules/prompt/PromptModule.tsx), [`build-display-prompt.ts`](../../src/core/ai/prompt-display/build-display-prompt.ts).

## Отличия от других вкладок

| Вкладка | Роль |
|---------|------|
| **DIRECTOR** | Запуск задач, история, apply Action Cards |
| **PROMPT** | Только просмотр / копирование промпта и контекста |
| **ARCHIVE** | Groq settings (Proxy URL, health check) |

## TaskId (основные)

Метаданные: [`director-tasks.ts`](../../src/core/ai/director-tasks.ts). Routing: [`task-registry.ts`](../../src/core/ai/prompts/registry/task-registry.ts).

| TaskId | Scope | Категория |
|--------|-------|-----------|
| `morningBriefing` | command | command |
| `eveningDebrief` | command | command |
| `weeklyAudit` | integration | system |
| `deepAnalysis14d` / `deepAnalysis30d` | full | system |
| `pdpReview`, `stageGateReview` | integration | system |
| `foundationCoach`, `planHift`, `planGpp`, … | foundation | coach / utility |
| `nutritionCoach` | nutrition | coach |
| `regulationCoach` | regulation | coach |
| `mindCoach`, `tacticalDebrief`, `decisionFollowUp` | mind | coach |
| `influenceCoach`, `contactBrief`, `operationReview` | influence | coach |
| `libraryCoach` | library | coach |
| `freeCommand`, `rescheduleDay`, `buildWeekSchedule` | full / command | utility |
| `doctrineReview` | command | system |

Для plan-задач (`planGpp`, `planHift`, …) scope сборки контекста принудительно `foundation`.

## Связанные документы

- [AI_DIRECTOR.md](../AI_DIRECTOR.md) — context manifest, validators
- [prompts/README.md](../../src/core/ai/prompts/README.md) — добавление задач
