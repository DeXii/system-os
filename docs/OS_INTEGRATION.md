# OS Integration Contract

Все модули AYANAKOJI OS — представления **одного ядра данных**. Дублирование ввода запрещено.

## Single Source of Truth

| Данные | Владелец | UI |
|--------|----------|-----|
| Порядок дня | `week-schedule` + `dayOverrides` | COMMAND — TODAY QUEUE |
| Миссии / протокол | `missions`, `protocolItems` | COMMAND, график (`refId`) |
| Тренировка | `workoutPlans`, `setLogs`, `cardioSessions` | FOUNDATION LIVE / Hub |
| Recovery ops | `dailyLogs` (sleep, hydration, …) | FOUNDATION, NUTRITION |
| Питание | `mealEntries`, `nutritionDays`, `nutritionPlanState`, `shoppingLists` | NUTRITION |
| HRV, дыхание, mindfulness, stress/PST, triggers | `hrvEntries`, `breathingSessions`, … | REGULATION |
| Chess/Go, SWOT, рефлексия, study | `chessGoSessions`, `reflections`, `scenarios`, `decisionLogs`, `studySessions` | MIND |
| MI, Nudge, Protocol, Bias | `influenceEntries` | INFLUENCE |
| Контакты / операции | `contacts`, `operations` | INFLUENCE |
| Библиотека (4 уровня) | `libraryBooks` | LIBRARY + `StageBooksWidget` |
| Readiness | `readiness.ts` | TopBar, все модули |
| PDP, synergy, audit | `pdp`, `aiInsights`, `stageProgress` | INTEGRATION |
| Operator params | `operator*Params` tables | engines (adaptive layer) |

## taskKey

Стабильный ID задачи на всю систему (полный список: [`src/content/task-keys.ts`](../src/content/task-keys.ts)):

**Foundation:** `foundation.workout`, `foundation.gpp`, `foundation.recovery`, `foundation.bft`, `foundation.cardio`

**Nutrition:** `nutrition.log`, `nutrition.plan`, `nutrition.review`

**Regulation:** `regulation.hrv`, `regulation.breathing.resonant`, `regulation.breathing.wimhof`, `regulation.breathing` (legacy), `regulation.mindfulness`, `regulation.stress`, `regulation.pst`, `regulation.trigger_log`

**Mind:** `mind.chess`, `mind.reflect.short`, `mind.reflect.extended`, `mind.reflect` (legacy), `mind.scenario`, `mind.decision_log`, `mind.decision.followup`, `mind.study`

**Influence:** `influence.protocol`, `influence.mi`, `influence.nudge`, `influence.bias`, `influence.observation`, `influence.contact_prep`, `influence.operation_review`

**Global:** `os.reading.weekly`, `command.briefing`, `command.debrief`, `command.doctrine_review`, `integration.weekly_audit`, `integration.pdp_review`

При merge этапов, переносе DIRECTOR и «выполнено» — искать по `taskKey`.

## os-kernel

Единая точка согласованности ([`src/core/kernel/`](../src/core/kernel/), [`os-kernel.ts`](../src/core/engines/os-kernel.ts)):

| Команда / hook | Назначение |
|----------------|------------|
| `ensureDayBootstrapped` | Протокол + миссии + график |
| `completeScheduleSlot` / `completeByTaskKey` | Отметка + compliance |
| `applyDirectorActions` | Action Cards |
| `afterFactWrite` | Domain event + cache invalidation ([`pipeline.ts`](../src/core/kernel/pipeline.ts)) |

**Foundation:** `afterWorkoutComplete`, `afterCardioComplete`, `afterRecoveryOpsSaved`

**Nutrition:** `afterMealLogged`, `afterNutritionPlanUpdated`, `afterShoppingListGenerated`, `afterNutritionGoalSet`

**Regulation:** `afterHrvComplete`, `afterBreathingComplete`, `afterMindfulnessComplete`, `afterStressLogComplete`, `afterTriggerLogComplete`

**Mind:** `afterChessGoComplete`, `afterReflectionComplete`, `afterScenarioComplete`, `afterDecisionLogComplete`, `afterStudySessionComplete`

**Influence:** `afterMiEntryComplete`, `afterNudgeEntryComplete`, `afterProtocolComplete`, `afterBiasEntryComplete`, `afterObservationComplete`, `afterContactSave`, `afterOperationSave`

**Library / Integration:** `afterBookMarkedRead`, `afterPdpSave`, `afterWeeklyAuditComplete`

## OpsSummary pattern

Единый UX/данные для этаповых модулей:

```text
get*OpsSummary()     → UI hints + COMMAND AlertsPanel
build*Directive()    → [РАСЧЁТ] · [ДЕЙСТВИЕ] · [ОТКАЗ] в OpsSummary + DIRECTOR context
subscribeOsRefresh   → пересчёт после kernel automations
```

Примеры: `RegulationOpsSummary` + `buildRegulationDirective`, `MindOpsSummary` + `buildMindDirective`, `NutritionOpsSummary` + `buildNutritionDirective`.

## MIND slots

При unlocked `mind`: chess/go, короткий PMR/OODA вечером. Сценарии — intensive extras. Decision log — по событию. `mind.decision.followup` — авто-миссия +7д после decision log. `mind.study` — учёба вне chess.

## LIBRARY

Отдельная вкладка Dock. Seed из `os-books-catalog.ts`. В FOUNDATION/REGULATION/MIND/INFLUENCE — `StageBooksWidget` только своего уровня (1–4). См. [modules/library.md](modules/library.md).

## REGULATION slots

При `syncFromMissionsAndProtocol` и разблокированном этапе `regulation`: HRV (утро), дыхание (резонанс или Wim Hof по дню недели), mindfulness. Stress / trigger log — по событию.

## INFLUENCE slots

При unlocked `influence`: MI (OARS), Nudge. Protocol и Bias — по событию/перед контактом. Legacy `influence.ethics` → `influence.protocol`; `ethicsChecked` не влияет на readiness.

## NUTRITION

Dock tab `nutrition` — не пятый этап пирамиды. Слоты и миссии: log / plan / review. Recovery ops из FOUNDATION могут завершать `foundation.recovery` через `afterRecoveryOpsSaved`.

## INTEGRATION

- Пирамида 4 этапа OS, synergy bottleneck, PDP, weekly audit
- Stage progression UI в INTEGRATION; COMMAND — hint
- Воскресный слот `integration.weekly_audit` в COMMAND queue

Модули **не должны** отдельно обновлять миссии и график.

## Export / import

Текущая версия snapshot: **17** ([`export-import.ts`](../src/core/data/export-import.ts)). Импорт перезаписывает IndexedDB. Ключ Groq не входит в экспорт.

Исторические вехи Dexie (v6 influence, v9 contacts, v12 study/trigger) — см. миграции в `src/core/db/`; для backup всегда указывайте **v17**.

## Domain events retention

- Таблица `domainEvents` — локальный журнал kernel/domain (не в cloud sync)
- Авто-prune записей старше **30 дней** (`DOMAIN_EVENTS_RETENTION_DAYS`)
- Debounced prune после emit (`schedulePruneDomainEvents`)
- Ручной prune: ARCHIVE → `DomainEventsPanel`

## События UI

`emitKernel(module, message, level, taskKey?)` → `subscribeOsRefresh` → `useOsState.refresh`.

## Иерархия приоритетов

1. Stage gates / readiness cap  
2. TODAY QUEUE rank  
3. Maintenance vs active tier  
4. DIRECTOR override на день  

Readiness deload снижает объём тренировки, но **не удаляет** слоты других этапов.
