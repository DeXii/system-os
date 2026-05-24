# AYANAKOJI OS — GitHub Release

Персональная tactical operating system (релизная сборка для GitHub Pages + Firebase).

Исходная dev-версия с локальной IndexedDB: папка `../AYANAKOJI`.

## Возможности релиза

- **GitHub Pages** — автодеплой из `main` через GitHub Actions
- **Firebase Auth + Firestore** — облачный snapshot данных OS
- **Dexie** — локальный кэш и офлайн-работа
- **Groq DIRECTOR** — API key на Cloudflare Worker, не в браузере

## Быстрый старт (локально)

```bash
cp .env.example .env
# заполните Firebase и VITE_GROQ_PROXY_URL
npm install
npm run dev
```

Откройте http://localhost:5173

## Деплой

Полная инструкция: **[docs/DEPLOY.md](docs/DEPLOY.md)**

1. Firebase project + Email/Password user
2. `workers/groq-proxy` → `wrangler deploy` + secrets
3. Private GitHub repo + Pages (GitHub Actions) + repository secrets
4. Push в `main`

## Сборка

```bash
npm run build
npm run preview
```

## Модули

| Модуль | Этап |
|--------|------|
| COMMAND | Центр управления |
| FOUNDATION | Физиологический фундамент |
| REGULATION | Саморегуляция, HRV |
| MIND | Стратегическое мышление |
| INFLUENCE | Этичное влияние |
| INTEGRATION | Пирамида, PDP, аудит |
| DIRECTOR | ИИ Groq |
| ARCHIVE | Облако, экспорт, настройки |

## Groq proxy

```bash
npm run proxy:dev
npm run proxy:deploy
```

Секреты worker: `GROQ_API_KEY` (обязательно), `PROXY_TOKEN` (опционально).
