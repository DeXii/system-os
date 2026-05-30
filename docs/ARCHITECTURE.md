# AYANAKOJI OS — Architecture

## Stack

- Vite + React 19 + TypeScript
- Dexie (IndexedDB) — local-first data
- Firebase Auth + Firestore — optional cloud snapshot ([`src/core/sync/cloud-sync.ts`](../src/core/sync/cloud-sync.ts))
- Groq API via Cloudflare Worker proxy ([`workers/groq-proxy/`](../workers/groq-proxy/))
- PWA (vite-plugin-pwa)
- Vitest for prompts, validators, kernel, export-import

## Layers

```text
Shell     TopBar, Dock, KernelLog, CommandPalette, Onboarding, AuthGate
  ↓
Modules   11 Dock tabs (see below)
  ↓
Core      domain, db, engines, cache, sync, events, data
  ↓
Kernel    bootstrap, complete, director apply, stage confirm, after-* automations, pipeline
  ↓
AI        context manifest → assemble-context → Groq → parse → validate → applyDirectorActions
```

## Modules (11)

| ModuleId | Role |
|----------|------|
| `command` | Daily ops: protocol, missions, TODAY QUEUE, compliance |
| `foundation` | Stage 1: workouts, BFT, recovery |
| `nutrition` | Nutrition tracking, meal plans, shopping (not a 5th readiness axis) |
| `regulation` | Stage 2: HRV, breathing, mindfulness, stress/PST |
| `mind` | Stage 3: chess/go, SWOT, reflection, decisions |
| `influence` | Stage 4: MI, nudge, protocol, contacts, operations |
| `library` | Books catalog (4 levels) + weekly reading |
| `integration` | Pyramid, synergy, PDP, weekly audit, stage gates |
| `director` | Groq DIRECTOR hub + Action Cards |
| `prompt` | Inspect system prompt / context without API call |
| `archive` | Groq settings, export/import, cloud sync, domain events |

Four **stage axes** for readiness: foundation, regulation, mind, influence. Nutrition has its own metrics/directive but does not add a fifth pyramid stage.

## Data flow

1. Module UI writes a **FACT** (journal, setLog, meal, …) via kernel automation or command.
2. [`afterFactWrite`](../src/core/kernel/pipeline.ts) emits domain event, bumps DB revision, invalidates derived caches.
3. `after-*` automation completes slots, updates compliance, recalculates readiness, refreshes OpsSummary hints.
4. DIRECTOR task calls `buildDirectorContextForTask(taskId)` → scoped JSON slices → Groq → validated actions → kernel.

Stable **`taskKey`** links schedule slot, mission, protocol item, and `completeByTaskKey`. See [OS_INTEGRATION.md](OS_INTEGRATION.md).

## Engines pattern

Per stage (and nutrition/integration):

```text
*-metrics.ts  →  get*OpsSummary() + build*Directive()
*-params.ts   →  operator*Params (persisted STATE)
*-thresholds.ts → gates for throttles / quality
```

Examples: `foundation-metrics`, `regulation-params`, `mind-readiness`, `nutrition-directive`, `integration-directive`.

## Export / cloud

- Local backup: **export JSON v17** — [`EXPORT_TABLE_KEYS`](../src/core/data/export-import.ts)
- Cloud sync: same tables except `domainEvents` (local debug / ephemeral)
- Domain events: 30-day retention — [`domain-events-retention.ts`](../src/core/events/domain-events-retention.ts)

## Security

- Groq API key: Cloudflare Worker secret only (not in repo)
- Optional `PROXY_TOKEN` on worker + `VITE_PROXY_TOKEN` in app
- Firebase Web config is public; access via Auth + Firestore rules

## Related docs

- [DATA_LAYERS.md](DATA_LAYERS.md) — FACT / DERIVED / ACTION / STATE / EVENT
- [OS_INTEGRATION.md](OS_INTEGRATION.md) — single source of truth, kernel hooks
- [AI_DIRECTOR.md](AI_DIRECTOR.md) — prompts v2, context manifest, actions
- [DOMAIN.md](DOMAIN.md) — entities, readiness, stage gates
- [modules/](modules/) — per-module specs
