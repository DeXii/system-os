# AYANAKOJI OS — Architecture

## Stack

- Vite + React 19 + TypeScript
- Dexie (IndexedDB) — local-first data
- Groq API via Cloudflare Worker proxy
- PWA (vite-plugin-pwa)

## Layers

1. **Shell** — TopBar, Dock, Kernel log, Command palette, DIRECTOR panel
2. **Core** — domain types, DB, readiness engine, stage gates, event bus
3. **AI** — DIRECTOR (Groq): master prompt, context builder, task registry, action parser
4. **Modules** — COMMAND, FOUNDATION, REGULATION, MIND, INFLUENCE, INTEGRATION, DIRECTOR, ARCHIVE

## Data flow

Modules read/write Dexie → ReadinessEngine recalculates → StageGates set module status → DIRECTOR receives context snapshot on each task.

## Security

- Groq API key: `localStorage` only
- Proxy URL: Cloudflare Worker (`workers/groq-proxy`)
- No secrets in repository
