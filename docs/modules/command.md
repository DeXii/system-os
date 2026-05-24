# COMMAND Module — Full Specification

## Purpose

Operational center for the Ayanokoji development path. Orchestrates daily protocol (full-stack 4 PDF stages), missions, readiness, compliance, stage progression, and DIRECTOR Groq integration.

## User decisions (implemented)

- **Protocol:** full stack, compact — 2 items × 4 stages = 8; current stage items = critical priority
- **Missions:** 4 critical anchors (one per stage) + 2 extra critical for current stage + evening debrief routine
- **Rhythm:** MORNING → DAY → EVENING
- **Compliance:** `40% protocol + 60% weighted missions` → affects current stage readiness (±5 via debrief)
- **Stage advance:** multi-criteria gates — blockers per transition + soft ≥80% + 10 qualifying days/14
- **Stage demotion:** auto-risk with operator confirm; unlocked stages preserved
- **DIRECTOR:** inline in COMMAND + side panel; morning briefing decides mission carryover
- **Week schedule:** template Пн–Вс + per-date overrides; **TODAY QUEUE** = single order of execution
- **Stage accumulation:** unlocked stages add missions; passed stages → maintenance (1/day)

## Screens / components

| Component | Role |
|-----------|------|
| CommandHeader | Global + 4 axis readiness, compliance bar |
| AlertsPanel | Rule hints from engines |
| StageAdvanceBanner | Accept / snooze stage transition |
| MorningPhase | Briefing, full protocol checklist |
| WeekSchedulePanel | 7-day view + TODAY QUEUE (rank 1..N) |
| DayPhase | Missions by critical / routine / optional + maintenance badge |
| EveningPhase | Compliance breakdown, debrief, notes |
| DirectorInline | History + apply OS actions |
| StageOverview | PDF 4 stages + streak progress |

## Readiness v2 formulas

### Cold start
No data in axis tables for 14 days → axis score = **50**.

### FOUNDATION (100 max)
- Training 7d: min(40, sessions/3 × 40)
- ACFT: 25 baseline + 15 if retest < 84 days
- Recovery 7d: min(35, days with sleep≥7 + nutrition + hydration) × 5

### REGULATION
- HRV: min(40, days/5 × 40)
- Breathing: min(35, sessions/5 × 35)
- Mindfulness: min(25, days/3 × 25)

### MIND
- Chess/Go: min(45, sessions/5 × 45)
- Reflections: min(35, count/3 × 35)
- Scenarios: 20 if ≥1 in 7d

### INFLUENCE (14d window)
- Ethical entries: min(60, count/4 × 60)
- Total practice: min(40, entries/6 × 40)

### Global
`0.4×F + 0.25×R + 0.2×M + 0.15×I`, capped if foundation/regulation weak.

### Compliance adjustment
After debrief: `delta = clamp((compliance - 70) / 10, -5, +5)` added to current stage score.

## DIRECTOR tasks in COMMAND

| taskId | Trigger |
|--------|---------|
| morningBriefing | Morning phase button |
| eveningDebrief | Evening phase button |
| weeklyAudit | DIRECTOR Ops |
| rescheduleDay | DIRECTOR Ops — move_slot actions |
| buildWeekSchedule | DIRECTOR Ops — week order proposal |
| stageGateReview | Via hints / manual |

### Action JSON
```json
[{"type":"add_mission","payload":{"title":"...","priority":"critical","stage":"foundation"}}]
```

## Flows

1. Load → `generateFullStackProtocol` + `generateFullStackMissions` if empty
2. `evaluateStageProgression` daily once
3. Toggle protocol/mission → refresh compliance
4. Morning briefing → `briefingDone`, optional action cards
5. Evening debrief → `debriefDone`, `stageAdjustment`, readiness refresh

## Test plan

- [ ] New user: 8 protocol items, 6+ missions, readiness 50 each axis
- [ ] Complete 60% protocol + half critical missions → compliance ~55
- [ ] Evening debrief saves DayReport with adjustment
- [ ] morningBriefing with yesterday pending → director suggests carry via JSON
- [ ] Stage banner after mocked 14-day streak (manual DB edit on stageProgress)
- [ ] Groq offline: phases work, director shows error
