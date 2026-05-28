# DIRECTOR prompts

## Pipeline

```
BASE (system, tone, hierarchy, safety, doctrine)
+ RULES (constraintIds from task-registry)
+ TEMPLATE (training | briefing | analysis | …)
+ OUTPUT FORMAT
+ ALLOWED ACTIONS
```

Context JSON is sent in the **user** message, not in system.

## Add a task

1. Add `taskId` to `director-tasks.ts` (UI metadata).
2. Add entry to `registry/task-registry.ts` (template, outputFormat, allowedActions, constraintIds).
3. If needed, extend a template under `templates/`.

## Layout

- `base/` — static core prompts
- `rules/` — constraint bullets (equipment, readiness, …)
- `templates/` — parameterized task bodies
- `registry/task-registry.ts` — routing table
- `builders/build-system-prompt.ts` — assembly
