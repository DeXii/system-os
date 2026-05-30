# Data layers — AYANAKOJI OS

Contracts: [`src/core/domain/contracts/`](../src/core/domain/contracts/)

## Layers

| Layer | Meaning | Persisted? |
|-------|---------|------------|
| **FACT** | What happened (logs, completed mission) | Yes — Dexie tables |
| **DERIVED** | Computed metrics (readiness, throttles, directives) | No — cache/snapshot only |
| **ACTION** | Proposed mutations (Director) | Transient until applied |
| **STATE** | Operator config + persisted snapshots | Dexie |
| **EVENT** | Domain / kernel audit trail | Dexie (`domainEvents`), 30d retention |

## Entity map

| Entity | Layer | Table | Written by |
|--------|-------|-------|------------|
| `SetLog`, `HrvEntry`, `BreathingSession`, `MealEntry`, … | FACT | journal tables | Module UI → kernel automations |
| `Mission`, `ProtocolItem` | FACT | `missions`, `protocolItems` | generators, UI, Director |
| `DayScheduleOverride` | FACT | `dayOverrides` | scheduler, Director |
| `ContactProfile`, `Operation` | FACT | `contacts`, `operations` | INFLUENCE UI |
| `DayReport` | STATE (snapshot) | `dayReports` | `command-compliance` |
| `StageProgressState` | STATE (@persistedDerived) | `stageProgress` | `stage-progression` |
| `OperatorProfile` | STATE | `operator` | onboarding, stage confirm |
| `operatorTrainingParams` | STATE | `operatorTrainingParams` | `training-params` / after-foundation |
| `operatorRegulationParams` | STATE | `operatorRegulationParams` | `regulation-params` |
| `operatorMindParams` | STATE | `operatorMindParams` | `mind-params` |
| `operatorInfluenceParams` | STATE | `operatorInfluenceParams` | `influence-params` |
| `operatorNutritionParams` | STATE | `operatorNutritionParams` | `nutrition-params` |
| `operatorIntegrationParams` | STATE | `operatorIntegrationParams` | `integration-params` |
| `NutritionGoal`, `nutritionPlanState` | STATE | nutrition tables | NUTRITION UI |
| `ReadinessScores` | DERIVED | — | `readiness.ts` / `getReadiness()` cache |
| `OperatorMode` | DERIVED | — | `operator-mode.ts` |
| Module directives (`*Directive` strings) | DERIVED | — | `*-metrics.ts` `build*Directive()` |
| `AiAction` | ACTION | — | Director → `applyDirectorActions` |
| `DomainEventRecord` | EVENT | `domainEvents` | `emitDomainEvent` / `afterFactWrite` |
| `derivedSnapshots` | DERIVED cache | `derivedSnapshots` | engines (optional persist) |
| `glossaryCache` | DERIVED cache | `glossaryCache` | glossary loader |
| `SystemEvent` | UI log | `systemEvents` | `emitKernel` |

## Rules

1. Never treat `hints` or `derived` AI context as facts.
2. Live readiness comes from `getReadiness()`; `stageProgress.readinessHistory` is for gates only.
3. All fact writes should go through kernel commands/automations when possible.
4. `taskKey` links mission, protocol, schedule slot, and kernel completion.
5. `domainEvents` are not exported to cloud sync; prune policy — see [OS_INTEGRATION.md](OS_INTEGRATION.md).

## Export snapshot

Full backup version **17** — all keys in [`EXPORT_TABLE_KEYS`](../src/core/data/export-import.ts). Legacy `acftEvents` retained for import compatibility; active fitness test is **BFT** (`bftEvents`).
