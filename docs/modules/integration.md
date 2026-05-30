# INTEGRATION Module

Мета-модуль: пирамида 4 этапов OS, synergy (bottleneck), PDP, weekly audit, stage progression.

## Панели

| Панель | Описание |
|--------|----------|
| `IntegrationOpsSummary` | compliance 7d, debrief rate, audit, PDP %, readiness 1–4 + directive |
| Pyramid | 4 этапа OS (FOUNDATION → INFLUENCE), readiness; клик → модуль |
| Synergy | 4 столбца + bottleneck + recommendation |
| Stage Progression | gate checklist, qualifying days, pendingAdvance / pendingDemotion |
| PDP | northStar, goals, focusStage, weeklyFocus, milestones |
| Weekly Audit | DIRECTOR `weeklyAudit` + aiInsights + apply actions |
| IntegrationDirectorPanel | pdpReview, stageGateReview, freeCommand |

## Пирамида vs PDF

- **UI INTEGRATION:** 4 блока = 4 этапа OS (`getPyramidStageScores`)
- **Справочно:** `PYRAMID_LEVELS` в `stages.ts` — 3 уровня PDF, не используется в PyramidPanel

## taskKey

- `integration.weekly_audit` — воскресный слот COMMAND
- `integration.pdp_review` — при сохранении PDP

## os-kernel

- `afterPdpSave` — pdp + operator.goals sync
- `afterWeeklyAuditComplete` — complete `integration.weekly_audit`
- `completeIntegrationPractice`
- `confirmStageAdvanceKernel` / `confirmStageDemotionKernel` (stage UI)

## Adaptive layer

| Файл | Роль |
|------|------|
| `integration-metrics.ts` | Ops 7d |
| `integration-params.ts` | `operatorIntegrationParams` |
| `integration-thresholds.ts` | weekly focus gates |
| `integration-context.ts` | bundle для DIRECTOR (stages, synergy, pdp) |
| `integration-directive.ts` | `buildIntegrationDirective()` → `derived.integration.integrationDirective` |

## DIRECTOR context

Slices: `integration.stages`, synergy, ops7d, pdp, lastWeeklyAudit, stageProgress (gate snapshot, pendingDemotion). Full context для `weeklyAudit`, `deepAnalysis*`, `freeCommand`.

## Stage gates (кратко)

| Переход | Ключевые blockers |
|---------|-------------------|
| 1→2 | foundation≥68, global≥58, compliance≥62%, debrief≥75%, BFT≤90д или ≥2 трен./7д |
| 2→3 | foundation≥52, regulation≥70, regulation practice≥4/14, HRV≥3/7д, debrief≥80% |
| 3→4 | foundation≥48, regulation≥50, mind≥68, mind practice≥3/14, ≥1 scenario/14д, no cognitive throttle |
| Demotion | FR collapse 7/10д → foundation; reg weak 5/7 → regulation; mind weak 5/7 → mind |

## Export

Snapshot **v17**: `pdp`, `stageProgress`, `operatorIntegrationParams`, `operatorDoctrine`, `aiInsights`, …
