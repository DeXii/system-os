# REGULATION Module

Этап 2 OS: HRV, резонансное дыхание LIVE, Wim Hof LIVE, mindfulness LIVE, stress/PST log, DIRECTOR regulationCoach.

## Компоненты

| Компонент | Назначение |
|-----------|------------|
| `HrvPanel` | RMSSD, resting HR, source, субъективная готовность, тренд 14d |
| `ResonantBreathLive` | Анимация вдох/выдох, пресеты 5.5–6 BPM |
| `WimHofLive` | Раунды power breaths → retention → recovery, disclaimer |
| `MindfulnessLive` | Таймер MMFT / body scan / focus |
| `StressLogPanel` | Полная форма + arousal + PST |
| `TriggerLogPanel` | Триггеры + maskScore 1–5 |
| `RegulationOpsSummary` | Сводка 7d + `buildRegulationDirective()` |
| `RegulationDirectorPanel` | Groq coach + apply OS actions |

## taskKey

- `regulation.hrv` — утренний check-in
- `regulation.breathing.resonant` — резонанс LIVE
- `regulation.breathing.wimhof` — Wim Hof LIVE
- `regulation.breathing` — legacy alias (любой режим дыхания)
- `regulation.mindfulness` — mindfulness LIVE
- `regulation.stress` — stress log (событийно)
- `regulation.pst` — отдельная PST-запись
- `regulation.trigger_log` — trigger log (событийно)

## os-kernel

- `afterHrvComplete` → `regulation.hrv`
- `afterBreathingComplete` → resonant / wimhof + alias `regulation.breathing`
- `afterMindfulnessComplete` → `regulation.mindfulness`
- `afterStressLogComplete` → stress + optional PST
- `afterTriggerLogComplete` → trigger log

## Adaptive layer

- `regulation-metrics.ts` — Ops summary, `buildRegulationDirective()`
- `regulation-params.ts` — `operatorRegulationParams`
- `regulation-thresholds.ts` — Wim Hof / resonant balance
- `regulation-validation.ts` — валидация доз и протоколов

## Dexie v4

Таблица `pstEntries`. Расширенные поля `breathingSessions`, `hrvEntries`, `stressLogs`.

## Readiness v3

Учитывает HRV trend, раздельно resonant vs wimhof, stress logs 7d. Штраф за перетренировку Wim Hof без резонанса.

## Протоколы

`src/content/regulation-protocols.ts` — пресеты дыхания, mindfulness, PST-шаблоны.

## Ручной test plan

1. HRV → слот `regulation.hrv` в COMMAND done
2. Резонанс LIVE 10 мин → лог + taskKey done
3. Wim Hof 3 раунда → лог + disclaimer
4. Mindfulness 10 мин → readiness refresh
5. Stress log полный → kernel + история
6. regulationCoach — ответ в панели
7. Readiness regulation растёт при серии 7d
8. Нет дублей taskKey в TODAY QUEUE
