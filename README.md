# AYANAKOJI OS — GitHub Release

Персональная **tactical operating system**: четыре этапа развития оператора (фундамент → саморегуляция → мышление → влияние), единый график дня, readiness-метрики и ИИ-директор Groq.

**Релизная сборка** (`AYANAKOJI-github`): GitHub Pages + Firebase Auth/Firestore + локальный Dexie (local-first, офлайн-кэш).

**Dev-версия** (только IndexedDB, без облака): папка `../AYANAKOJI`.

---

## Стек и ключевые возможности

| Компонент | Технология |
|-----------|------------|
| UI | React 19, Vite 6, TypeScript |
| Состояние UI | Zustand, react-router-dom |
| Локальные данные | Dexie (IndexedDB), local-first |
| Облако | Firebase Auth + Firestore snapshot — [`src/core/sync/cloud-sync.ts`](src/core/sync/cloud-sync.ts) |
| AI | Groq API через Cloudflare Worker — [`workers/groq-proxy/`](workers/groq-proxy/) |
| Валидация | Zod |
| PWA | vite-plugin-pwa |
| Тесты | Vitest — [`vitest.config.ts`](vitest.config.ts) |

**Возможности OS:**

- **Readiness v2** — четыре оси (foundation, regulation, mind, influence) + global cap; cold start 50 при отсутствии данных 14 дней
- **Stage gates** — advance (блокеры + soft ≥80% + 10 qualifying days/14) и demotion с подтверждением оператора; `unlockedStages` не сжимается при demote
- **Единый график дня** — шаблон недели + per-date overrides; **TODAY QUEUE** в COMMAND; стабильные **`taskKey`** на всю систему
- **OS Kernel** — единая точка bootstrap, completion и автоматизаций после записей
- **DIRECTOR v2** — слоистые промпты, контекст JSON, Action Cards с валидацией
- **Glossary** — термины PDF/OS в UI
- **Doctrine** — операторская доктрина в INTEGRATION
- **GitHub Pages** — автодеплой из `main` через GitHub Actions

---

## Архитектура

Слои приложения (сверху вниз):

```text
Shell     TopBar, Dock, KernelLog, CommandPalette, Onboarding, AuthGate
  ↓
Modules   COMMAND, FOUNDATION, NUTRITION, REGULATION, MIND, INFLUENCE, LIBRARY, INTEGRATION, DIRECTOR, PROMPT, ARCHIVE
  ↓
Core      engines, db, cache, sync, events, domain contracts
  ↓
Kernel    bootstrap, complete, director actions, stage confirm + automations
  ↓
AI        assemble context → Groq (proxy) → parse → applyDirectorActions
```

### Поток данных

Модули записывают **факты** (журналы, setLogs, HRV и т.д.) → **kernel automations** пересчитывают compliance, readiness, слоты графика → **DIRECTOR** получает scoped snapshot контекста на каждую задачу.

Стабильный идентификатор **`taskKey`** связывает слот в графике, миссию, пункт протокола и вызов `completeByTaskKey`. Дублирование ввода между модулями запрещено — см. [docs/OS_INTEGRATION.md](docs/OS_INTEGRATION.md).

### Структура `src/`

```text
src/
  app/           App, OsLayout, ErrorBoundary
  shell/         Dock, TopBar, AuthGate, Onboarding, BootScreen, CommandPalette
  modules/       command, foundation, nutrition, regulation, mind, influence,
                 library, integration, director, prompt, archive
  core/
    kernel/      commands (bootstrap, complete, director, stage) + automations
    engines/     readiness, scheduler, os-kernel, metrics, doctrine
    ai/          director/, prompts/, context/, constraints-builder
    domain/      types + contracts (FACT / DERIVED / ACTION / STATE)
    db/          Dexie schema, migrations, write helpers
    cache/       readiness, metrics, compliance, context
    sync/        Firestore cloud-sync
    events/      event-bus, replay
    firebase/    auth, config
    data/        export-import
  content/       stages, exercises, doctrine-defaults, task-keys, catalogs
  hooks/         useOsState, useBreakpoint
  ui/            ModuleShell, TerminalBlock, glossary, styles
```

---

## Этапы и пирамида

Четыре этапа развития ([`src/content/stages.ts`](src/content/stages.ts)):

| # | Этап | Модуль UI | Цель |
|---|------|-----------|------|
| 1 | Физиологический фундамент | FOUNDATION | Устойчивое тело и разум (GPP, HIFT, recovery) |
| 2 | Ядро саморегуляции | REGULATION | Эмоциональный контроль (HRV, дыхание, mindfulness, PST) |
| 3 | Оружие мышления | MIND | Стратегический анализ (шахматы/Go, SWOT, decision log) |
| 4 | Тактика влияния | INFLUENCE | Этичное влияние (MI, Nudge, досье, операции) |

**Мета-слои** (не привязаны к одному этапу):

| Модуль | Роль |
|--------|------|
| COMMAND | Центр дня: протокол, миссии, TODAY QUEUE, briefing/debrief, compliance |
| LIBRARY | Каталог книг 4 уровней + еженедельное чтение (`os.reading.weekly`) |
| INTEGRATION | Пирамида OS, synergy, PDP, weekly audit, stage progression |
| NUTRITION | Питание: meal log, планы, shopping; свой directive (не 5-я ось readiness) |
| DIRECTOR | ИИ Groq: задачи по scope, Action Cards |
| PROMPT | Превью system prompt и context JSON без вызова Groq |
| ARCHIVE | Облако, экспорт/импорт v17, domain events, настройки Groq |

Пирамида в INTEGRATION — **4 блока = 4 этапа OS** (`getPyramidStageScores`). Справочно в `stages.ts` есть `PYRAMID_LEVELS` (3 уровня PDF) — в UI PyramidPanel не используется.

---

## Модули

### COMMAND

Операционный центр дня. Протокол (8 пунктов, 2×4 этапа), миссии (critical / routine / optional), ритм MORNING → DAY → EVENING, compliance `40% protocol + 60% weighted missions`, недельный график и **TODAY QUEUE**, stage advance/demotion banners, inline DIRECTOR.

**Сущности:** `ProtocolItem`, `Mission`, `DayReport`, `WeekScheduleTemplate`, `DayScheduleOverride`, `ScheduleSlot`.

**Kernel:** `ensureDayBootstrapped`, `completeScheduleSlot`, `completeByTaskKey` (`command.debrief` и др.).

Подробнее: [docs/modules/command.md](docs/modules/command.md)

### FOUNDATION

Этап 1: тренировки без зала (HIFT, GPP, зарядка, растяжка, кардио), калибровка, **Bar Fitness Test (BFT)**, LIVE-режимы, recovery ops, `FoundationOpsSummary`.

**Сущности:** `WorkoutPlan`, `SetLog`, `OperatorCalibration`, `BftEvent`, `dailyLogs`.

**Kernel:** `afterWorkoutComplete` → слот done → readiness foundation.

Подробнее: [docs/modules/foundation.md](docs/modules/foundation.md)

### NUTRITION

Dock tab: учёт питания, цели, meal plan, shopping list, curated catalog. **Не** пятый этап пирамиды — отдельные метрики и `buildNutritionDirective()`.

**taskKey:** `nutrition.log`, `nutrition.plan`, `nutrition.review`.

**Kernel:** `afterMealLogged`, `afterNutritionPlanUpdated`, `afterShoppingListGenerated`, `afterNutritionGoalSet`, `afterRecoveryOpsSaved`.

Подробнее: [docs/modules/nutrition.md](docs/modules/nutrition.md)

### REGULATION

Этап 2: HRV, резонансное дыхание LIVE, Wim Hof LIVE, mindfulness LIVE, stress/PST journal, regulation coach DIRECTOR.

**taskKey:** `regulation.hrv`, `regulation.breathing.resonant`, `regulation.breathing.wimhof`, `regulation.mindfulness`, `regulation.stress`, `regulation.pst`.

**Kernel:** `afterHrvComplete`, `afterBreathingComplete`, `afterMindfulnessComplete`, `afterStressLogComplete`.

Подробнее: [docs/modules/regulation.md](docs/modules/regulation.md)

### MIND

Этап 3: Chess/Go журнал, SWOT/сценарии, PMR/OODA, decision log, mind coach DIRECTOR. Виджет `StageBooksWidget` (уровень 3) → полный каталог в LIBRARY.

**taskKey:** `mind.chess`, `mind.reflect.short`, `mind.scenario`, `mind.decision_log`.

**Kernel:** `afterChessGoComplete`, `afterReflectionComplete`, `afterScenarioComplete`, `afterDecisionLogComplete`.

Подробнее: [docs/modules/mind.md](docs/modules/mind.md)

### INFLUENCE

Этап 4: MI, Nudge, Influence Protocol, bias log, observation/debrief, **контакты** (досье) и **операции** (многоходовые кампании). DIRECTOR: influenceCoach, contactBrief, operationReview.

**taskKey:** `influence.protocol`, `influence.mi`, `influence.nudge`, `influence.bias`, `influence.observation`.

**Kernel:** `afterMiEntryComplete`, `afterNudgeEntryComplete`, `afterProtocolComplete`, `afterBiasEntryComplete`, `afterObservationComplete`.

Подробнее: [docs/modules/influence.md](docs/modules/influence.md), [docs/modules/contacts-operations.md](docs/modules/contacts-operations.md)

### LIBRARY

Отдельная вкладка Dock. Каталог книг четырёх уровней (`libraryBooks`), seed из `os-books-catalog.ts`. В модулях этапов — `StageBooksWidget` только своего уровня (1–4).

**taskKey:** `os.reading.weekly` — еженедельная миссия чтения.

**Kernel:** `afterBookMarkedRead` → завершение reading mission.

Подробнее: [docs/modules/library.md](docs/modules/library.md)

### INTEGRATION

Мета-модуль: пирамида 4 этапов, synergy (bottleneck), PDP, weekly audit, doctrine panel, stage progression (gates, qualifying days, pendingAdvance / pendingDemotion).

**taskKey:** `integration.weekly_audit`, `integration.pdp_review`.

**Kernel:** `afterPdpSave`, `afterWeeklyAuditComplete`, `confirmStageAdvanceKernel`, `confirmStageDemotionKernel`.

Подробнее: [docs/modules/integration.md](docs/modules/integration.md)

### DIRECTOR

ИИ-директор на Groq: задачи по scope (command, foundation, regulation, mind, influence, integration), история в `aiInsights`, применение Action Cards через kernel.

UI: вкладка DIRECTOR + боковая панель в COMMAND и модулях этапов.

Подробнее: [docs/AI_DIRECTOR.md](docs/AI_DIRECTOR.md)

### PROMPT

Инспекция system prompt и context JSON **без** вызова Groq: preview vs run, выбор `TaskId`, scope foundation для plan-задач. Полезно для отладки manifest slices.

Подробнее: [docs/modules/prompt.md](docs/modules/prompt.md)

### ARCHIVE

Системный meta-слой: Groq settings (Proxy URL в `.env`, опционально ключ/модель в `localStorage`), cloud sync Firebase, export/import JSON **v17**, domain events (retention 30d), история DIRECTOR insights.

Ключ Groq **не экспортируется** — после импорта на новом устройстве настройте заново в ARCHIVE.

Подробнее: [docs/modules/archive.md](docs/modules/archive.md)

---

## OS Kernel

Единая точка согласованности данных ([`src/core/kernel/index.ts`](src/core/kernel/index.ts)). Предпочитайте запись через kernel, а не прямой Dexie из UI.

### Commands

| Функция | Назначение |
|---------|------------|
| `ensureDayBootstrapped` | Протокол + миссии + график на день |
| `syncDayFromGenerators` | Синхронизация генераторов |
| `completeScheduleSlot` / `completeByTaskKey` | Отметка слота + compliance |
| `completeRegulationPractice` / `completeMindPractice` / … | Завершение практик по модулю |
| `applyDirectorActions` | Применение Action Cards DIRECTOR |
| `confirmStageAdvanceKernel` / `confirmStageDemotionKernel` | Подтвержение перехода этапа |

### Automations (`after-*`)

После записи факта в модуле — цепочка: обновить слот → compliance → readiness → hints:

- `after-foundation` — setLogs, workout, cardio
- `after-nutrition` — meal log, plan, shopping, goals
- `after-regulation` — HRV, дыхание, mindfulness, stress, trigger log
- `after-mind` — chess/go, reflection, scenario, decision, study
- `after-influence` — MI, nudge, protocol, bias, observation, contacts/operations
- `after-integration` — PDP, weekly audit, reading

После факта: `afterFactWrite` → domain event + invalidation cache ([`kernel/pipeline.ts`](src/core/kernel/pipeline.ts)).

Низкоуровневые хелперы также в [`src/core/engines/os-kernel.ts`](src/core/engines/os-kernel.ts).

---

## DIRECTOR / AI (v2)

### Настройка

1. API key: https://console.groq.com
2. Деплой proxy: `npm run proxy:deploy` (или `cd workers/groq-proxy && npx wrangler deploy`)
3. Секрет worker: `GROQ_API_KEY` (обязательно), `PROXY_TOKEN` (опционально, синхрон с `VITE_PROXY_TOKEN`)
4. В приложении: **ARCHIVE** → Groq settings → Proxy URL → **Проверить связь**

Ключ Groq хранится на **Cloudflare Worker**, не в репозитории. Proxy URL — в `.env` / GitHub secrets.

### Pipeline промптов

```text
BASE + RULES + TEMPLATE + OUTPUT FORMAT + ALLOWED ACTIONS  →  system prompt
CONTEXT JSON (+ сообщение оператора)                      →  user message
```

| Слой | Путь |
|------|------|
| Base | `src/core/ai/prompts/base/*.prompt.ts` |
| Rules | `src/core/ai/prompts/rules/*.rules.ts` |
| Templates | `src/core/ai/prompts/templates/*.template.ts` |
| Registry | `src/core/ai/prompts/registry/task-registry.ts` |
| Assembly | `src/core/ai/prompts/builders/build-system-prompt.ts` |
| Runtime | `src/core/ai/director/director-router.ts`, `director-service.ts` |
| Context manifest | `src/core/ai/prompts/registry/context-manifest.ts`, `src/core/ai/context/assemble-context.ts` |
| UI metadata | `src/core/ai/director-tasks.ts` |

Контекст **task-scoped**: каждая кнопка шлёт только slices из manifest (не весь scope). Full JSON — `freeCommand` и deep analysis. `constraints` / `aiMode` из `constraints-builder.ts`.

### Формат ответа

```markdown
## Вывод
## Решение
## Действия OS
```json
[]
```
## Риски   (опционально)
```

### Action Cards

| type | Эффект |
|------|--------|
| `add_mission` | Новая миссия |
| `add_protocol` | Пункт протокола |
| `set_workout_plan` | План в FOUNDATION (`allowedExerciseIds` only) |
| `set_cardio_session_plan` | Кардио-сессия |
| `move_slot` | Перенос в графике |
| `complete_slot` | Завершить слот |
| `add_schedule_slot` | Новый слот дня |
| `log_note` | Заметка в dailyLog |

Пост-парсинг: `prompts/validators/validate-actions.ts` (Zod + allowedActions + equipment).

Добавить задачу: запись в `director-tasks.ts` + `task-registry.ts` (templateId, allowedActions, constraintIds).

---

## Слои данных

Контракты: [`src/core/domain/contracts/`](src/core/domain/contracts/)

| Слой | Смысл | Персистентность |
|------|-------|----------------|
| **FACT** | Что произошло (логи, выполненная миссия) | Dexie |
| **DERIVED** | Вычисленные метрики (readiness, throttles) | Только cache/snapshot |
| **ACTION** | Предложенные мутации DIRECTOR | До применения |
| **STATE** | Профиль оператора + снимки (DayReport, stageProgress) | Dexie |

**Правила:**

1. Не трактовать AI `hints` / `derived` контекст как факты.
2. Live readiness — `getReadiness()`; `stageProgress.readinessHistory` — только для gates.
3. Запись фактов — через kernel commands/automations, когда возможно.
4. `taskKey` связывает mission, protocol, schedule slot и completion.

Подробнее: [docs/DATA_LAYERS.md](docs/DATA_LAYERS.md), [docs/DOMAIN.md](docs/DOMAIN.md)

---

## Разработка

### Быстрый старт

```bash
cp .env.example .env
# заполните VITE_FIREBASE_* и VITE_GROQ_PROXY_URL [, VITE_PROXY_TOKEN]
npm install
npm run dev
```

Откройте http://localhost:5173

Без Firebase приложение работает локально (Dexie); облачный sync и Auth требуют конфиг.

### Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Vite dev server (:5173) |
| `npm run build` | `tsc -b` + production build |
| `npm run build:pages` | То же для GitHub Pages |
| `npm run preview` | Preview production build |
| `npm test` | Vitest: prompts, validators, scheduler, db migrations, export-import |
| `npm run test:watch` | Vitest watch mode |
| `npm run proxy:dev` | Wrangler dev для groq-proxy (:8787) |
| `npm run proxy:deploy` | Деплой worker в Cloudflare |

### Переменные окружения

| Переменная | Описание |
|------------|----------|
| `VITE_BASE_PATH` | Base path для GitHub Pages (`/` или `/REPO/`) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `*.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_GROQ_PROXY_URL` | URL Cloudflare Worker (без слэша в конце) |
| `VITE_PROXY_TOKEN` | Опционально; должен совпадать с `PROXY_TOKEN` на worker |

Шаблон: [`.env.example`](.env.example)

### Локальный Groq

```bash
npm run proxy:dev
# → http://localhost:8787
```

В `.env`: `VITE_GROQ_PROXY_URL=http://localhost:8787`  
В ARCHIVE: **Проверить связь** (health: `/health` на worker).

### Сборка

```bash
npm run build
npm run preview
```

---

## Деплой

Полная инструкция: **[docs/DEPLOY.md](docs/DEPLOY.md)**

Краткий чеклист:

1. **Firebase** — проект, Firestore, Email/Password user, rules из [`firebase/firestore.rules`](firebase/firestore.rules)
2. **Cloudflare Worker** — `GROQ_API_KEY`, опционально `PROXY_TOKEN` → `npm run proxy:deploy`
3. **GitHub** — private repo, Pages (GitHub Actions), repository secrets (`VITE_*`)
4. **Push** в `main` → автодеплой

Проверка worker: `https://ВАШ-WORKER.workers.dev/health` → `{"ok":true,...}`

---

## Документация

| Документ | Содержание |
|----------|------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Обзор слоёв и data flow |
| [docs/AI_DIRECTOR.md](docs/AI_DIRECTOR.md) | Groq, промпты v2, actions, тесты |
| [docs/DATA_LAYERS.md](docs/DATA_LAYERS.md) | FACT / DERIVED / ACTION / STATE |
| [docs/DOMAIN.md](docs/DOMAIN.md) | Сущности, readiness v2, stage progression, schedule v3 |
| [docs/OS_INTEGRATION.md](docs/OS_INTEGRATION.md) | taskKey, single source of truth, kernel hooks |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Firebase, Pages, secrets, troubleshooting |
| [docs/modules/command.md](docs/modules/command.md) | COMMAND |
| [docs/modules/foundation.md](docs/modules/foundation.md) | FOUNDATION |
| [docs/modules/regulation.md](docs/modules/regulation.md) | REGULATION |
| [docs/modules/mind.md](docs/modules/mind.md) | MIND |
| [docs/modules/influence.md](docs/modules/influence.md) | INFLUENCE |
| [docs/modules/contacts-operations.md](docs/modules/contacts-operations.md) | Контакты и операции |
| [docs/modules/integration.md](docs/modules/integration.md) | INTEGRATION |
| [docs/modules/nutrition.md](docs/modules/nutrition.md) | NUTRITION |
| [docs/modules/library.md](docs/modules/library.md) | LIBRARY |
| [docs/modules/prompt.md](docs/modules/prompt.md) | PROMPT |
| [docs/modules/archive.md](docs/modules/archive.md) | ARCHIVE |

### История документации

- **2026-05-31** — синхронизация с export v17, модули nutrition/prompt/library, domain-events retention, OpsSummary/directives, context slices.

---

## Безопасность

- Секреты **не коммитятся** в репозиторий (`.env` в `.gitignore`)
- `GROQ_API_KEY` — только секрет Cloudflare Worker
- Firebase config (`VITE_FIREBASE_*`) — публичные ключи Web SDK; доступ к данным — через [Firestore rules](firebase/firestore.rules) и Auth
- Репозиторий и деплой рассчитаны на **личное** использование одного оператора

---

## Groq proxy (кратко)

```bash
npm run proxy:dev      # локально
npm run proxy:deploy   # production
```

Секреты worker: `GROQ_API_KEY` (обязательно), `PROXY_TOKEN` (опционально).

Подробнее: [docs/AI_DIRECTOR.md](docs/AI_DIRECTOR.md), [docs/DEPLOY.md](docs/DEPLOY.md)
