# Деплой AYANAKOJI-github

Релизная версия для **личного** использования: GitHub Pages + Firebase Firestore + Cloudflare Worker (Groq proxy).

## 1. Firebase

1. [Firebase Console](https://console.firebase.google.com/) → Create project.
2. **Build → Firestore Database** → Create database (production mode).
3. **Rules** → вставьте содержимое [`firebase/firestore.rules`](../firebase/firestore.rules) → Publish.
4. **Build → Authentication** → Sign-in method → **Email/Password** → Enable.
5. **Users** → Add user (ваш email и пароль).
6. **Project settings → Your apps** → Add web app → скопируйте config:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`

## 2. Cloudflare Worker (Groq proxy)

```bash
cd workers/groq-proxy
npm install
npx wrangler login
npx wrangler secret put GROQ_API_KEY
# опционально:
npx wrangler secret put PROXY_TOKEN
npx wrangler deploy
```

Скопируйте URL worker (например `https://ayanakoji-groq-proxy.xxx.workers.dev`) → `VITE_GROQ_PROXY_URL` (без слэша в конце).

Проверка после деплоя: откройте `https://ВАШ-WORKER.workers.dev/health` — должен быть JSON:

```json
{"ok":true,"service":"ayanakoji-groq-proxy","hasGroqKey":true}
```

**Признак устаревшего worker:** в ответе `/health` текст Groq `unknown_url` / `GET /openai/v1/health` или заголовок `x-groq-region` в DevTools → Network. Нужен повторный `npm run proxy:deploy` из корня репозитория.

Из корня репозитория: `npm run proxy:deploy` (то же, что `cd workers/groq-proxy && npm install && npx wrangler deploy`).

Если задали `PROXY_TOKEN` на worker, тот же токен → `VITE_PROXY_TOKEN` в GitHub secrets и `.env`.

**console.groq.com** без VPN может показывать 403 — создайте API key через VPN; приложение ходит в Groq через worker (Cloudflare), не из браузера напрямую.

## 3. GitHub репозиторий

1. Создайте **private** репозиторий (рекомендуется).
2. Push содержимого папки `AYANAKOJI-github` в ветку `main`.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Repository secrets

| Secret | Описание |
|--------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase web apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authDomain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase projectId |
| `VITE_FIREBASE_APP_ID` | Firebase appId |
| `VITE_GROQ_PROXY_URL` | URL Cloudflare worker |
| `VITE_PROXY_TOKEN` | Опционально, если включён на worker |
| `VITE_BASE_PATH` | `/` для `username.github.io`; `/REPO/` для project pages |

После push в `main` workflow **Deploy to GitHub Pages** соберёт и опубликует `dist`.

## 4. Локальная разработка

```bash
cp .env.example .env
# заполните .env
npm install
npm run dev
```

## 5. Миграция данных из dev (AYANAKOJI)

1. В локальном **AYANAKOJI**: ARCHIVE → **Экспорт JSON**.
2. Откройте задеплоенный сайт → войдите в Firebase.
3. ARCHIVE → **Импорт JSON** → данные загрузятся в IndexedDB и уйдут в Firestore.

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Белый экран / Firebase config | Проверьте secrets в GitHub Actions |
| 401 от Groq proxy | `PROXY_TOKEN` на worker и `VITE_PROXY_TOKEN` должны совпадать |
| Assets 404 на Pages | `VITE_BASE_PATH` должен совпадать с URL (`/REPO/` со слэшами) |
| CORS / DIRECTOR offline | Worker задеплоен, `VITE_GROQ_PROXY_URL` верный |
| «Сгенерировать план» / DIRECTOR зависает на «Запрос к Groq...» | Обновите страницу после деплоя (Ctrl+Shift+R) — нужна миграция IndexedDB v10. В консоли не должно быть `KeyPath ... is not indexed` |
| Таймаут Groq 90 с | Повторите запрос; при стабильных таймаутах проверьте worker и модель в ARCHIVE |
| `Failed to fetch` после «Запрос к Groq...» | Тяжёлый запрос + таймаут worker (~30 с на Free). Обновите приложение, проверьте `VITE_GROQ_PROXY_URL` (https). При необходимости Paid Worker или модель `llama-3.1-8b-instant` в ARCHIVE |
| console.groq.com 403 Forbidden | Гео-блок; ключ создавать через VPN. На работу DIRECTOR через worker не влияет, если `/health` и Groq ping OK |
| Worker 404 / ERR_CONNECTION_RESET | `npx wrangler deploy` в `workers/groq-proxy`; URL в secrets = URL из вывода deploy; curl `.../health` и POST `.../v1/chat/completions` (см. ниже) |
| Groq 403 в ответе DIRECTOR | Новый API key через VPN → `wrangler secret put GROQ_API_KEY` |
| `/health` показывает Groq `unknown_url` | На Cloudflare старая версия worker → `npm run proxy:deploy`, в ответе не должно быть `x-groq-region` |
| URL в GitHub верный, ARCHIVE не работает | ARCHIVE → «Сбросить URL proxy» (localStorage перекрывает secret) |

### Проверка worker (PowerShell)

```powershell
curl.exe -i "https://ВАШ-WORKER.workers.dev/health"
curl.exe -i -X POST "https://ВАШ-WORKER.workers.dev/v1/chat/completions" -H "Content-Type: application/json" -d "{\"model\":\"llama-3.1-8b-instant\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":5}"
```

Ожидается: `/health` → **200**, тело `{"ok":true,"hasGroqKey":true}`, **без** заголовка `x-groq-region`. POST → 200 с текстом от модели.

### GitHub Action для worker (опционально)

Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Workflow `.github/workflows/deploy-groq-proxy.yml` деплоит worker при push в `workers/groq-proxy/**`.
