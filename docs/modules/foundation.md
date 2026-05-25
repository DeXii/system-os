# FOUNDATION

Этап 1: физиологический фундамент (турник + брусья, без зала).

## Секции

- **Уровень оператора** — HIFT / GPP / зарядка / растяжка (старт «Средний», авто + ручная правка) → `operatorFitnessLevels`
- **Калибровка** — макс. подтягивания, брусья, планка → `operatorCalibration`
- **Bar Fitness Test** — вместо полного ACFT → `bftEvents`
- **Тренировки (Hub)** — кнопки HIFT, GPP (push/pull/кор/ноги), зарядка, растяжка, кардио; счётчики и дата последней сессии
- **Превью плана** — правка подходов/повторов/секунд → Принять → LIVE
- **LIVE** — HIFT (круг ×3, отдых 2 мин), GPP/утро (подходы с отдыхом), кардио (время, км, пульс)
- **Recovery Ops** — сон, питание, гидратация → `dailyLogs`
- **DIRECTOR** — Body Coach + свободный запрос (планы тренировок — из Hub)

## Каталоги упражнений

Отдельные базы (~30+ на тип): `src/content/exercises/` — HIFT, GPP push/pull/core/legs, warmup, stretch. Уровни: Начинающий … Ayanakoji.

## DIRECTOR и Groq

- Настройка Groq в **ARCHIVE** (API Key + Proxy URL).
- Задачи: `planHift`, `planGpp`, `planWarmup`, `planStretch`, `planCardioIntense`, `planCardioEasy`.
- Контекст 7 дней: `setLogsByKind`, `workoutTypeStats`, `fitnessLevels`, `gppRotationNext`.
- Actions: `set_workout_plan` (kind, structure, rounds…), `set_cardio_session_plan`.
- Fallback: «Простой план без ИИ» — локальные `build*PlanLocal`.

## Firebase

Новые таблицы в snapshot (v8): `operatorFitnessLevels`, `workoutTypeStats`, `cardioSessions` — вместе с `setLogs`, `workoutPlans`.

## GPP ротация

Рекомендуемый тип подсвечивается жёлтым: push → pull → core → legs по последней выполненной GPP-сессии.

## Связь с COMMAND

Слот `foundation.workout` в TODAY QUEUE. После LIVE — `afterWorkoutComplete` / `afterCardioComplete`.

## Прогрессия

- Успех ≥80% за 3 сессии категории → уровень +1; <50% → −1 (с учётом manual override).
- Подходы: макс. 4; повторы/секунды по логам 7–14 дней.
- readiness.foundation < 45 → deload в legacy planner.
