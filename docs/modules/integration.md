# INTEGRATION Module

Мета-модуль: пирамида 4 этапов OS, synergy (bottleneck), PDP, weekly audit, stage progression.

## Панели

| Панель | Описание |
|--------|----------|
| Integration Ops | compliance 7d, debrief rate, audit, PDP %, readiness по этапам 1–4 |
| Pyramid | 4 этапа OS (снизу FOUNDATION → сверху INFLUENCE), отдельный readiness; клик → модуль |
| Synergy | 4 столбца + bottleneck + recommendation |
| Stage Progression | gate checklist (blockers/soft), qualifying days, pendingAdvance / pendingDemotion, Accept / Snooze |
| PDP | northStar, goals, focusStage, weeklyFocus, milestones; sync → operator.goals |
| Weekly Audit | DIRECTOR weeklyAudit + история aiInsights + apply actions |
| DIRECTOR | pdpReview, stageGateReview, freeCommand |

## Пирамида vs PDF

- **UI INTEGRATION:** 4 блока = 4 этапа OS (`getPyramidStageScores`)
- **Справочно:** `PYRAMID_LEVELS` в `stages.ts` — 3 уровня PDF (L1 = foundation+regulation), не используется в PyramidPanel

## taskKey

- `integration.weekly_audit` — воскресный слот COMMAND + complete после audit
- `integration.pdp_review` — kernel emit при сохранении PDP

## os-kernel

- `afterPdpSave` — pdp + operator.goals sync
- `afterWeeklyAuditComplete` — complete integration.weekly_audit
- `completeIntegrationPractice`

## DIRECTOR context

`integration.stages` (4 этапа), synergy, ops7d, pdp, lastWeeklyAudit, stageProgress (lastGateSnapshot, pendingDemotion).

## Stage gates (кратко)

| Переход | Ключевые blockers |
|---------|-------------------|
| 1→2 | foundation≥68, global≥58, compliance≥62%, debrief≥75%, BFT≤90д или ≥2 трен./7д |
| 2→3 | foundation≥52, regulation≥70, regulation practice≥4/14, HRV≥3/7д, debrief≥80% |
| 3→4 | foundation≥48, regulation≥50, mind≥68, mind practice≥3/14, ≥1 scenario/14д, no cognitive throttle |
| Demotion | FR collapse 7/10д → foundation; reg weak 5/7 → regulation; mind weak 5/7 → mind |
