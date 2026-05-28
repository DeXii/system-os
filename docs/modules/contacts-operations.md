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

Export snapshot version **9** включает `contacts`, `operations`, `operatorDoctrine`, `triggerLogs`, `studySessions`.
