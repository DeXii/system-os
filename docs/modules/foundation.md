# FOUNDATION



Этап 1: физиологический фундамент (турник + брусья, без зала).



## Секции



- **Калибровка** — макс. подтягивания, брусья, планка → `operatorCalibration`

- **Bar Fitness Test** — вместо полного ACFT → `bftEvents`

- **Today Workout** — локальный `workout-planner` или DIRECTOR `planWorkout` + **Принять план**

- **LIVE** — подходы, таймер отдыха (+30 сек), `setLogs`

- **Recovery Ops** — сон, питание, гидратация → `dailyLogs`

- **DIRECTOR panel** — совет, planWorkout, свободный запрос (HIFT на турнике)



## DIRECTOR в FOUNDATION



- Требуется Groq в **ARCHIVE** (API Key + Proxy URL). Без настройки кнопки покажут ошибку, не молчат.

- Контекст включает: `setLogsSummary`, `bftHistory`, `trainingSessions`, калибровку, каталог `allowedExerciseIds`.

- Ограничение: только турник, брусья, bodyweight — штанга/зал запрещены в промпте.

- Action `set_workout_plan` → план попадает в Today Workout.



## Связь с COMMAND



Слот `foundation.workout` в TODAY QUEUE. После LIVE — `os-kernel.afterWorkoutComplete` отмечает слот без ручного дубля.



## Прогрессия



- Все подходы ≥ target → +1 rep

- 2 провала подряд → −1 rep / −1 set

- readiness.foundation < 45 → deload


