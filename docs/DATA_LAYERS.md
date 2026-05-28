# Data layers — AYANAKOJI OS

Contracts: [`src/core/domain/contracts/`](../src/core/domain/contracts/)

## Layers

| Layer | Meaning | Persisted? |
|-------|---------|------------|
| **FACT** | What happened (logs, completed mission) | Yes — Dexie tables |
| **DERIVED** | Computed metrics (readiness, throttles) | No — cache/snapshot only |
| **ACTION** | Proposed mutations (Director) | Transient until applied |
| **STATE** | Operator config + persisted derived snapshots | Mixed |

## Entity map

| Entity | Layer | Table | Written by |
|--------|-------|-------|------------|
| `SetLog`, `HrvEntry`, `BreathingSession`, … | FACT | journal tables | Module UI → kernel automations |
| `Mission`, `ProtocolItem` | FACT | `missions`, `protocolItems` | generators, UI, Director |
| `DayScheduleOverride` | FACT | `dayOverrides` | scheduler, Director |
| `DayReport` | STATE (snapshot) | `dayReports` | `command-compliance` |
| `StageProgressState` | STATE (@persistedDerived) | `stageProgress` | `stage-progression` |
| `OperatorProfile` | STATE | `operator` | onboarding, stage confirm |
| `ReadinessScores` | DERIVED | — | `readiness.ts` / `getReadiness()` cache |
| `OperatorMode` | DERIVED | — | `operator-mode.ts` |
| `AiAction` | ACTION | — | Director → `applyDirectorActions` |
| `DomainEventRecord` | EVENT | `domainEvents` | `emitDomainEvent` |
| `SystemEvent` | UI log | `systemEvents` | `emitKernel` |

## Rules

1. Never treat `hints` or `derived` AI context as facts.
2. Live readiness comes from `getReadiness()`; `stageProgress.readinessHistory` is for gates only.
3. All fact writes should go through kernel commands/automations when possible.
4. `taskKey` links mission, protocol, schedule slot, and kernel completion.
