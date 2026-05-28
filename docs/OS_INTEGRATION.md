# OS Integration Contract

Все модули AYANAKOJI OS — представления **одного ядра данных**. Дублирование ввода запрещено.

## Single Source of Truth

| Данные | Владелец | UI |
|--------|----------|-----|
| Порядок дня | `week-schedule` + `dayOverrides` | COMMAND — TODAY QUEUE |
| Миссии / протокол | `missions`, `protocolItems` | COMMAND, график (`refId`) |
| Тренировка | `workoutPlans`, `setLogs` | FOUNDATION LIVE |
| HRV, дыхание, mindfulness, stress/PST | `hrvEntries`, `breathingSessions`, `mindfulnessSessions`, `stressLogs`, `pstEntries` | REGULATION |
| Chess/Go, SWOT, рефлексия | `chessGoSessions`, `reflections`, `scenarios`, `decisionLogs` | MIND |
| MI, Nudge, Protocol, Bias | `influenceEntries` | INFLUENCE |
| Библиотека (4 уровня) | `libraryBooks` | LIBRARY + виджет в каждом этапе |
| Readiness | `readiness.ts` | TopBar, все модули |
| PDP, synergy, audit | `pdp`, `aiInsights`, `stageProgress` | INTEGRATION |

## taskKey

Стабильный ID задачи на всю систему:

- `foundation.workout` — слот тренировки + план + LIVE
- `regulation.hrv` — HRV + слот в графике
- `regulation.breathing.resonant` / `regulation.breathing.wimhof` — LIVE дыхание
- `regulation.breathing` — legacy: любой режим дыхания за день
- `regulation.stress` / `regulation.pst` — журнал стресса и PST
- `mind.chess`, `mind.reflect.short`, `mind.scenario`, `mind.decision_log`
- `influence.protocol`, `influence.mi`, `influence.nudge`, `influence.observation`, `influence.bias`
- `os.reading.weekly` — еженедельная миссия чтения
- `integration.weekly_audit` — воскресный системный аудит
- `integration.pdp_review` — сохранение / разбор PDP
- `command.debrief` — вечерний debrief

При merge этапов, переносе DIRECTOR и «выполнено» — искать по `taskKey`.

## os-kernel

Единая точка согласованности:

- `ensureDayBootstrapped` — протокол + миссии + график
- `completeScheduleSlot` / `completeByTaskKey` — отметка + compliance
- `applyDirectorActions` — move_slot, add_mission, …
- `afterWorkoutComplete` — setLogs → слот done → readiness
- `afterHrvComplete` / `afterBreathingComplete` / `afterMindfulnessComplete` / `afterStressLogComplete` — REGULATION
- `afterChessGoComplete` / `afterReflectionComplete` / `afterScenarioComplete` / `afterDecisionLogComplete` — MIND
- `afterMiEntryComplete` / `afterNudgeEntryComplete` / `afterProtocolComplete` / `afterBiasEntryComplete` / `afterObservationComplete` — INFLUENCE
- `afterBookMarkedRead` — LIBRARY → `os.reading.weekly`
- `afterPdpSave` / `afterWeeklyAuditComplete` — INTEGRATION

## MIND slots

При unlocked `mind`: chess/go, короткий PMR/OODA вечером. Сценарии — intensive extras. Decision log — по событию.

## LIBRARY

Отдельная вкладка Dock. Seed из `os-books-catalog.ts`. В FOUNDATION/REGULATION/MIND/INFLUENCE — `StageBooksWidget` только своего уровня (1–4).

## REGULATION slots

При `syncFromMissionsAndProtocol` и разблокированном этапе `regulation` добавляются слоты: HRV (утро), дыхание (резонанс или Wim Hof по дню недели), mindfulness. Stress — по событию, не ежедневный слот.

## INFLUENCE slots

При unlocked `influence`: MI (OARS), Nudge. Protocol и Bias — по событию/перед контактом. Export/import version **6**.

## Dexie v6

Расширенный `InfluenceEntry`; legacy `ethicsChecked` не влияет на readiness.

## Dexie v12 / Export v9

Таблицы: `contacts`, `operations`, `operatorDoctrine`, `triggerLogs`, `studySessions`.

Kernel: `afterContactSave`, `afterOperationSave`, `afterTriggerLogComplete`, `afterStudySessionComplete`; `afterDecisionLogComplete` ставит `followUpDueDate` (+7d).

Авто-миссии: `mind.decision.followup`, `mind.study` (при простое).

## INTEGRATION

- Пирамида L1–L3, synergy bottleneck, PDP, weekly audit
- Stage progression UI в INTEGRATION; COMMAND — hint
- Export/import version **7** (`PdpMilestone` с id)
- Воскресный слот `integration.weekly_audit` в COMMAND queue

Модули **не должны** отдельно обновлять миссии и график.

## События

`emitKernel(module, message, level, taskKey?)` → `subscribeOsRefresh` → `useOsState.refresh`.

## Иерархия приоритетов

1. Stage gates / readiness cap  
2. TODAY QUEUE rank  
3. Maintenance vs active tier  
4. DIRECTOR override на день  

Readiness deload снижает объём тренировки, но **не удаляет** слоты других этапов.
