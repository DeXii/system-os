# DIRECTOR prompts

## Pipeline

```text
BASE (system, tone, hierarchy, safety, doctrine)
+ RULES (constraintIds from task-registry)
+ TEMPLATE (training | briefing | analysis | cognitive | nutrition | regulation | …)
+ OUTPUT FORMAT
+ ALLOWED ACTIONS
→ build-system-prompt.ts
```

Context JSON is sent in the **user** message, not in system.

Runtime: `director-router.ts` → Groq → `director-response-parser.ts` → `validate-actions.ts` → `exercise-id-remap.ts` → `applyDirectorActions`.

## Context assembly

| Path | Role |
|------|------|
| `../context/context-slice-types.ts` | `ContextSliceId` definitions |
| `../context/slice-groups.ts` | Slice → DB load groups |
| `../context/assemble-context.ts` | `buildDirectorContextForTask` |
| `../context/apply-slice-filter.ts` | Filter layered JSON by slices |
| `registry/context-manifest.ts` | Manifest per `TaskId` |
| `registry/context-manifest-audit.ts` | Required paths audit |
| `../context-builder.ts` | `buildFlatDirectorContext(groups, …)` |
| `../../cache/context-cache.ts` | Cache + revision invalidation |

See [docs/AI_DIRECTOR.md](../../../../docs/AI_DIRECTOR.md) for slice rules and bridges.

## Add a task

1. Add `taskId` to `../director-tasks.ts` (UI metadata).
2. Add entry to `registry/task-registry.ts` (templateId, outputFormat, allowedActions, constraintIds).
3. Add slices to `registry/context-manifest.ts` (+ audit paths if new slice IDs).
4. If needed, extend a template under `templates/`.

Per-task `.ts` files under `tasks/` are optional — prefer `task-registry.ts` only.

## Layout

- `base/` — static core prompts
- `rules/` — constraint bullets (equipment, readiness, …)
- `templates/` — parameterized task bodies
- `registry/task-registry.ts` — routing table
- `builders/build-system-prompt.ts` — assembly
- `validators/validate-actions.ts` — Zod + allowedActions
- `validators/exercise-id-remap.ts` — catalog ID remap for workout plans
- `tests/` — `npm test` (validate-actions, manifest audit, …)
