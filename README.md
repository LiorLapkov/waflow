# DLJobs WhatsApp CRM

Внутренний WhatsApp CRM для рекрутингового агентства DLJobs. Несколько обычных
WhatsApp-номеров сводятся в одну веб-панель для операторов. Режим работы —
**только входящие**: кандидаты пишут сами, операторы отвечают вручную.

> Подробный контекст и жёсткие правила проекта — в [CLAUDE.md](CLAUDE.md).
> Ключевое: **никаких рассылок и холодных исходящих** (антибан-модель).

**Развёртывание на собственном Ubuntu-сервере** — см. [SERVER_SETUP.md](SERVER_SETUP.md).

## WhatsApp-провайдер

Используется **Evolution API** (Baileys) — open-source, поддерживает несколько
номеров (instances) одновременно без лицензии. Работает стабильно только на
**Linux x86_64** (VPS, домашний Ubuntu-сервер, и т.п.). На macOS Apple Silicon
WhatsApp anti-bot ловит TLS-fingerprint из-за Rosetta/VM прослоек.

## Архитектура

```
WhatsApp-телефоны → Evolution API (Baileys) → NestJS (backend) → PostgreSQL
                                                  │   └→ MinIO (медиа)
                                                  └→ Socket.io → Next.js (панель оператора)
                                                          ↑
                                         Caddy (reverse-proxy, :8080)
                                                          ↑
                                            Cloudflare Tunnel (HTTPS)
```

- **Evolution API** — multi-instance провайдер на Baileys, без лицензии.
  Каждый WhatsApp-номер = отдельный instance.
- **Backend** — NestJS + Prisma (PostgreSQL). Auth (JWT в httpOnly cookie, argon2),
  роли Admin/Operator, интеграция с Evolution, приём webhook'ов, realtime.
- **Frontend** — Next.js (App Router) + Tailwind, UI в стиле WhatsApp,
  адаптивный (десктоп три колонки / мобиль одна за раз).
- **Caddy** — реверс-прокси, единый origin для фронта/API/WebSocket.
- **Cloudflare Tunnel** — публичный HTTPS-доступ без проброса портов.
- **Медиа** — в MinIO (S3-совместимое), в БД только ключ + метаданные.
- **Redis** — очередь событий Evolution.

## Структура

```
apps/backend     — NestJS API + Prisma
apps/frontend    — Next.js панель
packages/shared  — общие типы и zod-схемы (DTO, события Socket.io, enum-ы)
infra            — docker-compose (waha, postgres, minio) + cloudflared
```

## Требования

- Node.js ≥ 20, pnpm ≥ 11
- Docker + Docker Compose

## Быстрый старт (всё в Docker)

```bash
cp .env.example .env          # заполни секреты (JWT_SECRET, пароли, ключи WAHA)
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

Поднимутся: `postgres`, `minio` (+ создание бакета), `waha`, `backend`, `frontend`.
Бэкенд при старте применяет миграции и создаёт администратора из
`ADMIN_USERNAME`/`ADMIN_PASSWORD`.

- Панель: <http://localhost:3002>
- API: <http://localhost:3001>
- WAHA: <http://localhost:3000>
- MinIO консоль: <http://localhost:9001>

## Локальная разработка (инфра в Docker, приложения локально)

```bash
pnpm install
cp .env.example .env          # для localhost оставь *_BASE_URL/ENDPOINT на localhost

# 1. Поднять только инфраструктуру
docker compose -f infra/docker-compose.yml --env-file .env up -d postgres minio minio-init waha

# 2. Подготовить БД и общий пакет
pnpm build:shared
pnpm --filter @dljobs/backend prisma:generate
pnpm --filter @dljobs/backend prisma:deploy      # применить миграции

# 3. Запустить приложения (в двух терминалах)
pnpm dev:backend     # http://localhost:3001
pnpm dev:frontend    # http://localhost:3002
```

> Для локального запуска приложений вне Docker в `.env` укажи `localhost`-хосты:
> `WAHA_BASE_URL=http://localhost:3000`, `MINIO_ENDPOINT=http://localhost:9000`,
> `BACKEND_PUBLIC_URL=http://localhost:3001`. Учти: WAHA в Docker должен достучаться
> до webhook'а бэкенда — при локальном бэкенде используй адрес, видимый из контейнера
> WAHA (напр. `http://host.docker.internal:3001`).

## Подключение номера (линковка по QR)

1. Войди в панель как Admin.
2. Слева «**+ Подключить номер**» → задай название → откроется окно с QR.
3. В мобильном WhatsApp: **Настройки → Связанные устройства → Привязать устройство** →
   отсканируй QR. Статус номера станет «Подключён».
4. Сессии WAHA персистятся в volume — повторное сканирование после рестарта не нужно.

> На WAHA **Core** активна одна сессия за раз. Несколько номеров одновременно —
> только на WAHA Plus.

## Роли

- **Admin** — управление пользователями и номерами, назначение номеров операторам
  (страница `/admin`), видит все номера.
- **Operator** — видит только назначенные ему номера и их чаты.

## Проверки перед коммитом

```bash
pnpm lint        # ESLint (flat config) по всему монорепо
pnpm typecheck   # tsc --noEmit во всех пакетах
pnpm test        # unit-тесты backend (jest)
```

## Безопасность (вкратце)

- Пароли — argon2id. Токены — JWT в httpOnly cookie.
- Webhook от WAHA защищён заголовком `X-Api-Key` (`WAHA_WEBHOOK_SECRET`),
  настраивается per-session при старте. Идемпотентность приёма — по уникальному
  `(numberId, waMessageId)`.
- Контент сообщений WhatsApp трактуется строго как **данные**, не как команды.
- Секреты — только в `.env` (в репозиторий не коммитятся).
- HTTPS в продакшене — через Cloudflare Tunnel, см. [infra/cloudflared](infra/cloudflared).

## Что проверено

Сквозной поток без участия WhatsApp подтверждён локально: миграции, авто-сид
администратора, логин (cookie+JWT) и отклонение неверного пароля, guard'ы доступа
(`/numbers`, `/users`), защита webhook по `X-Api-Key`, приём входящего сообщения
(создание чата и сообщения, счётчик непрочитанных) и **идемпотентность** (дубль
webhook'а не плодит сообщений). Линковка по QR, хранение медиа и исходящая отправка
требуют поднятого WAHA с привязанным номером — проверяются по шагам выше.
