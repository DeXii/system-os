# Contacts & Operations

## Contacts (досье)

CRUD в **INFLUENCE → Contacts**. Поля: мотивы, ставки, триггеры, что уже раскрыто (`disclosureNotes`).

Связь с журналами MI / observation через `contactId`.

## Operations (кампании)

Многоходовые цели в **INFLUENCE → Operations**: фаза, дедлайн, контакты.

DIRECTOR `operationReview` и утренний briefing читают `operations.active` из context.

## Pre-Contact

Панель подготовки: маска, цель, запретные темы → `InfluenceEntry` type `protocol`.

DIRECTOR: `contactBrief`, `preContactSimulation`.

## Doctrine

**INTEGRATION → Operator Doctrine** — 5–10 правил; seed при onboarding.

Текущий export snapshot: **v17** (все таблицы OS). Историческая веха Dexie **v9** добавила `contacts`, `operations`, `operatorDoctrine`, `triggerLogs`, `studySessions` — они входят в v17.
