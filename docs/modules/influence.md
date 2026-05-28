# INFLUENCE Module

Этап 4 — **тактика класса**: влияние без ethics gate. Influence Protocol (тактический чеклист) не блокирует журналы MI/Nudge.

## Панели

| Панель | taskKey | Описание |
|--------|---------|----------|
| Contacts | — | досье людей (мотивы, disclosure) |
| Operations | — | многоходовые кампании |
| Pre-Contact | `influence.protocol` | маска, цель, tactical protocol + DIRECTOR brief/sim |
| Influence Protocol | `influence.protocol` | 4 пункта чеклиста оператора перед контактом |
| MI Journal (OARS) | `influence.mi` | situation, open questions, affirm/reflect, summarize, what worked, outcome |
| Nudge Journal | `influence.nudge` | context, nudge type, outcome |
| Bias Log | `influence.bias` | когнитивное искажение + коррекция |
| Observation / Debrief | `influence.observation` | Theory of Mind, post-contact debrief |
| Influence Ops | — | 7d метрики + hints из COMMAND |
| DIRECTOR | `influenceCoach`, `contactBrief`, `operationReview` | тактика класса |

## taskKey (stage)

- anchor: `influence.mi`
- protocol: `influence.mi`, `influence.nudge`
- extras: `influence.open_questions`, `influence.bias`

Legacy `influence.ethics` заменён на `influence.protocol`.

## os-kernel

- `afterMiEntryComplete`, `afterNudgeEntryComplete`, `afterBiasEntryComplete`, `afterProtocolComplete`, `afterObservationComplete`
- `completeInfluencePractice` — слот + kernel + compliance

## Readiness (influence v2, 14d)

- 40% MI (≥2 записи)
- 25% nudge (≥1)
- 20% protocol days (≥2)
- 15% bias или observation/debrief (≥1)

Поле `ethicsChecked` в старых записях игнорируется.

## Dexie v6

Расширенный `InfluenceEntry` с OARS/nudge/bias/protocol полями. Migration: `context` → `situation` для legacy MI.

## DIRECTOR

`influenceCoach` использует `influence.ops7d`, `influence.recentEntries`, `influence.throttle` из context-builder.
