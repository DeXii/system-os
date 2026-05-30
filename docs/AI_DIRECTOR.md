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

### exercise-id-remap

After Zod validation, `prompts/validators/exercise-id-remap.ts` maps AI exercise IDs to catalog IDs when the model returns aliases or stale keys. Applies to `set_workout_plan` actions only. Prevents silent plan rejection in FOUNDATION LIVE.

## Context cache

`src/core/cache/context-cache.ts` caches assembled context JSON keyed by `taskId:lookback:workoutKind`. Invalidated on DB revision bump from `afterFactWrite` (same pipeline as readiness/compliance cache). Prevents stampede when multiple DIRECTOR panels mount the same task.

## Context manifest (task-scoped)

Каждая кнопка DIRECTOR (`TaskId`) собирает **только нужные slices**, а не весь scope-модуль.

```text
TaskId → context-manifest.ts (slices[]) → lazy load groups → splitLayeredContext → applySliceFilter → user JSON
```

| Path | Role |
|------|------|
| `prompts/registry/context-manifest.ts` | Manifest per `TaskId` |
| `prompts/registry/context-manifest-audit.ts` | Required JSON paths + audit helpers |
| `context/slice-groups.ts` | Slice → DB load groups |
| `context/apply-slice-filter.ts` | Output filter by slices |
| `context/assemble-context.ts` | `buildDirectorContextForTask` |
| `context-builder.ts` | `buildFlatDirectorContext(groups, …)` |

Формат user JSON: layered `{ date, taskId, fact, derived, hints }`.

**Full context** (`mode: 'full'`) — только `freeCommand`, `deepAnalysis14d`, `deepAnalysis30d`.

### Что нельзя резать

- **Kernel:** `meta`, `operator`, `operatorMode`, `constraints` / `ruleHints` (если есть `constraintIds: readiness`).
- **Actions:** `set_workout_plan` → `fact.foundation.allowedExerciseIds` + catalog; `move_slot` / `complete_slot` → `fact.schedule.todayQueue`.
- **Directives в JSON:** `mind.mindDirective` (mind-задачи; user-prefix для mind нет), `regulation.regulationDirective`, `nutrition.nutritionDirective`, `derived.integration.integrationDirective` (audit/weekly).
- **Cross-module bridges:** briefing → regulation + foundation plan; nutrition → readiness; plan-cardio → `cardioSessionsInWindow`.

### Add a task

1. Entry in `director-tasks.ts`
2. Entry in `task-registry.ts` (templateId, outputFormat, allowedActions, constraintIds)
3. **Manifest** in `context-manifest.ts` (slices from template + actions + kernel)
4. Paths in `context-manifest-audit.ts` if new slice IDs
5. Extend template if needed

### Add a module

1. New `ContextSliceId` with module prefix (`myModule.*`) in `context-slice-types.ts`
2. Load group + builder in `context-builder.ts` (`buildFlatDirectorContext`)
3. `SLICE_TO_GROUPS` + `SLICE_REQUIRED_PATHS` + `applySliceFilter` cases
4. Manifest lines for affected tasks

## Tests

```bash
npm test
```

See `src/core/ai/prompts/tests/`.

## Context

`buildDirectorContextForTask(taskId)` — manifest slices + `constraints` / `aiMode`. Cache key: `taskId:lookback:workoutKind`.

Legacy: `buildDirectorContext(scope)` → delegates to a default task (prefer `buildDirectorContextForTask`).

## Prompt package docs

See [`src/core/ai/prompts/README.md`](../src/core/ai/prompts/README.md) for layout, adding tasks, context slices, and validators.
