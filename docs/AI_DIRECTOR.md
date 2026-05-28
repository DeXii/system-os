# DIRECTOR — Groq Integration

## Setup

1. Get API key: https://console.groq.com
2. Deploy proxy:

   ```bash
   cd workers/groq-proxy
   npm install
   npx wrangler deploy
   ```

3. Local dev: `npx wrangler dev` → Proxy URL `http://localhost:8787`
4. In app: **ARCHIVE** → Groq settings → Key + Proxy URL → **Проверить связь**

## Task IDs

UI metadata: `src/core/ai/director-tasks.ts`  
Prompt routing: `src/core/ai/prompts/registry/task-registry.ts`

## Prompt architecture (v2)

Pipeline:

```text
BASE + RULES + TEMPLATE + OUTPUT FORMAT + ALLOWED ACTIONS  → system
CONTEXT JSON (+ operator message)                          → user
```

| Layer | Path |
|-------|------|
| Base | `prompts/base/*.prompt.ts` |
| Rules | `prompts/rules/*.rules.ts` |
| Templates | `prompts/templates/*.template.ts` |
| Registry | `prompts/registry/task-registry.ts` |
| Assembly | `prompts/builders/build-system-prompt.ts` |
| Runtime | `director/director-router.ts`, `director/director-service.ts` |

Persona: analytical style inspired by **Аянокоджи Киётака** — cold strategy, tactical influence, mask and information discipline in INFLUENCE tasks.

Context includes `constraints` (flags, `aiMode`) from `constraints-builder.ts`.

## Response contract

```markdown
## Вывод
## Решение
## Действия OS
```json
[]
```
## Риски   (optional)
```

## Action Cards

| type | Effect |
|------|--------|
| add_mission | Новая миссия |
| add_protocol | Пункт протокола |
| set_workout_plan | План в FOUNDATION (`allowedExerciseIds` only) |
| set_cardio_session_plan | Кардио-сессия |
| move_slot | Перенос в графике |
| complete_slot | Завершить слот |
| add_schedule_slot | Новый слот дня |
| log_note | Заметка в dailyLog |

Post-parse validation: `prompts/validators/validate-actions.ts` (Zod + allowedActions + equipment).

## Add a task

1. Entry in `director-tasks.ts`
2. Entry in `task-registry.ts` (templateId, outputFormat, allowedActions, constraintIds)
3. Extend template if needed

## Tests

```bash
npm test
```

See `src/core/ai/prompts/tests/`.

## Context

`buildDirectorContext(scope)` — scoped payload + `constraints` / `aiMode`. Full JSON in user message only.
