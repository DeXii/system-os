# Domain Model — AYANAKOJI OS

## COMMAND entities

### ProtocolItem
Daily full-stack checklist (8 items compact). Fields: `stage`, `priority` (critical for current stage), `phase`, `done`.

### Mission
Daily tasks with `priority` (critical/routine/optional), `status`, `source` (protocol | director | manual).

### DayReport
Per-day compliance snapshot:
- `protocolPct`, `missionPct` (0–1)
- `compliance` = round(100 × (0.4 × protocol + 0.6 × missions weighted))
- `briefingDone`, `debriefDone`
- `stageAdjustment` — delta applied to current stage readiness after evening debrief

### StageProgressState
Singleton `id: progress`. Tracks `stageStreaks`, `globalStreak`, `pendingAdvance`, `advanceSnoozeUntil`.

## Readiness v2

Cold start: 50 per axis if no data in 14 days.  
Global cap: if foundation < 45 or regulation < 40, global ≤ max(foundation, regulation) + 15.

## Stage progression (multi-criteria gates)

Advance uses per-transition blockers + soft score (≥80%) + **10 qualifying days** in last 14 (stored in `readinessHistory.qualified`). Criteria differ for foundation→regulation, regulation→mind, mind→influence (see `stage-transition-rules.ts`). Operator confirms `pendingAdvance` in COMMAND/INTEGRATION.

**Demotion (auto-risk):** if foundation<40 and regulation<38 for 7/10 days → `pendingDemotion → foundation`; regulation<42 for 5/7 on mind+ → regulation; mind<45 for 5/7 on influence → mind. Operator confirms; `unlockedStages` is **not** shrunk.

On advance: `unlockedStages` grows; old stages → maintenance. On demote: `currentStage` lowers; unlocked preserved.

## Schedule (v3)

- `WeekScheduleTemplate` — slots per weekday (0=Mon)
- `DayScheduleOverride` — per-date queue (manual | director)
- `ScheduleSlot` — `taskKey`, `rank`, `type`, `refId`, `status`

## FOUNDATION (v3)

- `OperatorCalibration`, `WorkoutPlan`, `SetLog`, `BftEvent`
- Integration via `os-kernel` — see [OS_INTEGRATION.md](OS_INTEGRATION.md)

## INFLUENCE v4 — Contacts & Operations

- `ContactProfile` — досье (мотивы, ставки, disclosureNotes)
- `Operation` — многоходовая кампания (phase, deadline, contactIds)
- `InfluenceEntry` — optional `contactId`, `maskUsed`, `infoDisclosed`, `infoHeld`

## MIND / REGULATION extensions

- `DecisionLogEntry` — `followUpDueDate`, `followUpDone`, `actualOutcome`
- `TriggerLog` — триггеры + maskScore 1–5
- `StudySession` — учёба вне chess
- `OperatorDoctrine` — singleton `id: doctrine`, `rules[]`

## NUTRITION entities

Types: [`src/core/domain/nutrition-types.ts`](../src/core/domain/nutrition-types.ts)

| Entity | Table | Purpose |
|--------|-------|---------|
| `Ingredient`, `Dish` | `ingredients`, `dishes` | Curated catalog (+ custom tables) |
| `NutritionGoal` | `nutritionGoals` | Targets (kcal, macros) |
| `OperatorBodyMetrics` | `operatorBodyMetrics` | Weight / body comp log |
| `NutritionPlanState` | `nutritionPlanState` | Active meal plan |
| `NutritionDay`, `MealEntry` | `nutritionDays`, `mealEntries` | Daily tracking |
| `ShoppingList` | `shoppingLists` | Generated lists |
| `OperatorNutritionParams` | `operatorNutritionParams` | Adaptive layer (STATE) |

Nutrition does **not** add a fifth readiness axis; it has `buildNutritionDirective()` for OpsSummary and DIRECTOR.

## Operator params (STATE)

Persisted adaptive tuning per module:

- `operatorTrainingParams` — foundation / training
- `operatorRegulationParams` — regulation doses
- `operatorMindParams` — mind chess/reflect calibration
- `operatorInfluenceParams` — influence quality
- `operatorNutritionParams` — nutrition adherence
- `operatorIntegrationParams` — integration weekly focus

Updated by `after-*` automations and dedicated `*-params.ts` engines.

## taskKey

Stable ID linking mission, protocol, and schedule slot (e.g. `foundation.workout`, `regulation.hrv`, `nutrition.log`, `influence.contact_prep`, `mind.decision.followup`, `regulation.trigger_log`).
