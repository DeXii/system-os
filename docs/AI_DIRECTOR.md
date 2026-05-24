# DIRECTOR — Groq Integration

## Setup

1. Get API key: https://console.groq.com
2. Deploy proxy:

   ```bash
   cd workers/groq-proxy
   npm install
   npx wrangler deploy
   ```

3. Local dev: `npx wrangler dev` → Proxy URL `http://localhost:8787`
4. In app: **ARCHIVE** → Groq settings → Key + Proxy URL → **Проверить связь**

## Task IDs (registry: `src/core/ai/director-tasks.ts`)

### Core (12)

| taskId | Purpose | Default scope |
|--------|---------|---------------|
| morningBriefing | Утренний протокол и миссии | command |
| eveningDebrief | Вечерний разбор | command |
| weeklyAudit | Системный аудит | integration |
| pdpReview | Разбор PDP | integration |
| stageGateReview | Gate / demotion | integration |
| foundationCoach | Bar HIFT / recovery | foundation |
| planWorkout | План тренировки + `set_workout_plan` | foundation |
| regulationCoach | HRV, дыхание, PST | regulation |
| mindCoach | EF, шахматы, метапознание | mind |
| influenceCoach | Тактика влияния | influence |
| libraryCoach | Книга по этапу | library |
| freeCommand | Свободный запрос | full |

### Extended (3)

| taskId | Purpose |
|--------|---------|
| rescheduleDay | Перенос слотов |
| buildWeekSchedule | График недели |
| tacticalDebrief | Разбор решений |

## Action Cards

DIRECTOR outputs `## Действия OS` with JSON. UI shows **Action Cards** with per-action checkboxes.

| type | Effect |
|------|--------|
| add_mission | Новая миссия |
| add_protocol | Пункт протокола |
| set_workout_plan | План в FOUNDATION (`allowedExerciseIds` only) |
| move_slot | Перенос в графике |
| complete_slot | Завершить слот |
| add_schedule_slot | Новый слот дня |
| log_note | Заметка в dailyLog |

Apply via **Применить выбранные** or **Применить все**.

## Architecture

- **Hub**: модуль DIRECTOR (Dock) — все 12 core tasks + история
- **ARCHIVE**: Groq config, export/import, полный архив insights — см. [modules/archive.md](modules/archive.md)
- **Sidebar**: `DirectorPanel` — quick tasks по активному модулю
- **Per-module**: `DirectorTaskPanel` в FOUNDATION, REGULATION, MIND, INFLUENCE, INTEGRATION

## Master prompt

See `src/core/ai/prompts/director-master.ts` — hierarchy, ethics, bar-only FOUNDATION, all action types.

## Context

`buildDirectorContext(scope)` — при `scope !== full` отдаёт базовый слой + блок текущего модуля (command всегда full).
