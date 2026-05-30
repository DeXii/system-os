# FOUNDATION

Этап 1: физиологический фундамент (турник + брусья, без зала).

## Секции

- **Уровень оператора** — HIFT / GPP / зарядка / растяжка (старт «Средний», авто + ручная правка) → `operatorFitnessLevels`
- **Калибровка** — макс. подтягивания, брусья, планка → `operatorCalibration`
- **Bar Fitness Test (BFT)** — вместо полного ACFT → `bftEvents` (legacy `acftEvents` только в старых export)
- **Тренировки (Workout Hub)** — `WorkoutHubPanel`: HIFT, GPP (push/pull/кор/ноги), зарядка, растяжка, кардио; счётчики и дата последней сессии
- **Превью плана** — правка подходов/повторов/секунд → Принять → LIVE
- **LIVE** — HIFT (круг ×3, отдых 2 мин), GPP/утро (подходы с отдыхом), кардио (время, км, пульс)
- **Recovery Ops** — сон, питание, гидратация → `dailyLogs`
- **FoundationOpsSummary** — сводка 7d + `buildFoundationDirective()`
- **DIRECTOR** — Body Coach + свободный запрос (планы — из Hub)

## Каталоги упражнений

Отдельные базы (~30+ на тип): `src/content/exercises/` — HIFT, GPP push/pull/core/legs, warmup, stretch. Уровни: Начинающий … Ayanakoji.

## Adaptive layer

| Файл | Роль |
|------|------|
| `foundation-metrics.ts` | Ops summary, `buildFoundationDirective()` |
| `training-params.ts` | `operatorTrainingParams` — дозы, deload |
| `foundation-load.ts` | Нагрузка 7d / recovery signal |
| `workout-stats.ts` | GPP rotation, type stats |

## DIRECTOR и Groq

- Настройка Groq в **ARCHIVE** (Proxy URL в `.env`).
- Задачи: `planHift`, `planGpp`, `planWarmup`, `planStretch`, `planCardioIntense`, `planCardioEasy`.
- Context: manifest slices + `allowedExerciseIds`; post-parse `exercise-id-remap`.
- Actions: `set_workout_plan`, `set_cardio_session_plan`.
- Fallback: «Простой план без ИИ» — локальные `build*PlanLocal`.

## Export / cloud

Таблицы foundation в snapshot **v17**: `operatorFitnessLevels`, `workoutTypeStats`, `cardioSessions`, `setLogs`, `workoutPlans`, `operatorTrainingParams`, `bftEvents`, …

## GPP ротация

Рекомендуемый тип подсвечивается: push → pull → core → legs по последней GPP-сессии (`getRecommendedGppSubtype`).

## Связь с COMMAND

Слот `foundation.workout` в TODAY QUEUE. После LIVE — `afterWorkoutComplete` / `afterCardioComplete`.

## Прогрессия

- Успех ≥80% за 3 сессии категории → уровень +1; <50% → −1 (с учётом manual override).
- Подходы: макс. 4; повторы/секунды по логам 7–14 дней.
- readiness.foundation < 45 → deload в planner / training-params.
