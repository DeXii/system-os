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
| InfluenceOpsSummary | — | 7d метрики + `buildInfluenceDirective()` |
| DIRECTOR | `influenceCoach`, `contactBrief`, `operationReview` | тактика класса |

## taskKey (stage)

- anchor: `influence.mi`
- protocol: `influence.mi`, `influence.nudge`
- extras: `influence.open_questions`, `influence.bias`
- contacts/ops: `influence.contact_prep`, `influence.operation_review`

Legacy `influence.ethics` заменён на `influence.protocol`.

## os-kernel

- `afterMiEntryComplete`, `afterNudgeEntryComplete`, `afterBiasEntryComplete`, `afterProtocolComplete`, `afterObservationComplete`
- `afterContactSave`, `afterOperationSave`
- `completeInfluencePractice` — слот + kernel + compliance

## Adaptive layer

| Файл | Роль |
|------|------|
| `influence-metrics.ts` | Ops 7d, directive input |
| `influence-params.ts` | `operatorInfluenceParams` |
| `influence-thresholds.ts` | throttle / quality gates |
| `influence-quality.ts` | качество записей |
| `influence-readiness.ts` | вклад в ось influence |
| `contact-metrics.ts` | метрики по досье |

`buildInfluenceDirective()` — `[РАСЧЁТ] · [ДЕЙСТВИЕ] · [ОТКАЗ]` в OpsSummary и DIRECTOR context.

## Readiness (influence v2, 14d)

- 40% MI (≥2 записи)
- 25% nudge (≥1)
- 20% protocol days (≥2)
- 15% bias или observation/debrief (≥1)

Поле `ethicsChecked` в старых записях игнорируется.

## Export v17

`influenceEntries`, `contacts`, `operations`, `operatorInfluenceParams`, `operatorDoctrine`.

## DIRECTOR

`influenceCoach` — slices `influence.*`, throttle, recent entries. `contactBrief` / `operationReview` — scoped context для досье и кампаний.
