# waflow

> Self-hosted multi-number WhatsApp inbox for teams.
> Inbound-only, mobile-friendly, built on Evolution API (Baileys).

**waflow** lets you wire up several regular WhatsApp numbers into a single
shared web inbox, so a small team can answer messages together. It is built
around an explicit anti-ban model: **only inbound conversations** — no bulk
sends, no cold outreach, no auto-replies on a hair-trigger.

If you came here to spam, this isn't the project. If you need a shared inbox
for your operators answering candidates / customers / leads — read on.

> **Deploying on your own Ubuntu server?** Follow [SERVER_SETUP.md](SERVER_SETUP.md).

## Features

- **Multiple WhatsApp numbers** in one panel (Evolution API instances, no licence).
- **Role-based access**: Admin (manages users + numbers) / Operator (handles chats).
- **Mobile-friendly UI** in the WhatsApp dark theme — three columns on desktop,
  one screen at a time on phones with back navigation.
- **All media types**: text, images, video, voice notes, documents — stored in
  MinIO (S3-compatible), never blobs in Postgres.
- **Real-time** inbox via Socket.io. New messages and chat updates land
  immediately.
- **LID handling**: WhatsApp's privacy aliases (`@lid`) are resolved to a real
  phone number when the provider can do so — important if you need a contact
  database, not just a chat log.
- **Idempotent webhook** intake (deduped on `(numberId, waMessageId)`) so
  provider retries never double a message.
- **Authentication**: argon2 password hashing, JWT in httpOnly cookies.
- **Reverse-proxy out of the box** (Caddy on `:8080`) — one origin for the
  whole stack, ready for Cloudflare Tunnel / a public domain.

## Architecture

```
WhatsApp phones → Evolution API (Baileys) → NestJS (backend) → PostgreSQL
                                                │   └→ MinIO (media)
                                                └→ Socket.io → Next.js (operator panel)
                                                        ↑
                                       Caddy (reverse-proxy, :8080)
                                                        ↑
                                       Cloudflare Tunnel (HTTPS, optional)
```

| Service | Role |
|---|---|
| `evolution` | Evolution API — Baileys WhatsApp client, one instance per number. |
| `evolution_postgres` | Separate Postgres for Evolution state (sessions, contacts). |
| `redis` | Event queue for Evolution. |
| `postgres` | App database — users, chats, messages, media metadata. |
| `minio` | Object storage for media files. |
| `backend` | NestJS + Prisma. Auth, REST API, Socket.io, webhook ingest. |
| `frontend` | Next.js (App Router) + Tailwind. The operator panel UI. |
| `caddy` | Reverse-proxy: `/api/*` and `/socket.io/*` → backend, the rest → frontend. |

## Requirements

- Linux x86_64 host (VPS, home server, mini-PC). Evolution / Baileys is known
  to **not** establish a stable session on Apple Silicon (Mac M-series) because
  the WhatsApp anti-bot layer rejects the TLS fingerprint of Rosetta-emulated
  containers.
- Docker Engine + Compose v2.
- ≥ 2 GB RAM for a 1–2 number setup; 4 GB for 5+ numbers; SSD recommended.
- Outbound internet access (Evolution holds WebSockets to WhatsApp).

## Quick start

```bash
git clone https://github.com/<your-user>/waflow.git
cd waflow

# 1. configure secrets
cp .env.example .env
# edit .env: set ADMIN_USERNAME/ADMIN_PASSWORD, generate random values for
# JWT_SECRET, EVOLUTION_API_KEY (= EVOLUTION_WEBHOOK_SECRET), POSTGRES_PASSWORD,
# MINIO_ROOT_PASSWORD, EVOLUTION_DB_PASSWORD.

# 2. bring up the stack
docker compose -f infra/docker-compose.yml --env-file .env up -d --build

# panel:  http://localhost:8080
# log in with ADMIN_USERNAME / ADMIN_PASSWORD from .env
```

For a public HTTPS URL via Cloudflare Tunnel and 24/7 setup notes,
see [SERVER_SETUP.md](SERVER_SETUP.md).

## Linking a WhatsApp number

1. Log in as admin → press **"+ Connect number"** → give it a label.
2. Scan the QR code with your phone: **WhatsApp → Linked devices → Link a device**.
3. The status indicator turns green → start receiving messages.

Repeat for each number you want in the shared inbox. Each operator who is
created later inherits access to every existing number automatically (you can
narrow that down per-operator in `/admin`).

## Design rules (hard constraints)

These are baked into the project and shouldn't be loosened without thought:

1. **Inbound-only.** No bulk sender. No "outbound campaigns". No address-book
   import for cold contact. This is the anti-ban model — break it and the
   number gets banned.
2. **Auto-replies — use sparingly.** Any auto-message must come with a delay
   and not on every chat. Instant identical replies at machine speed look like
   a bot.
3. **Media goes to object storage**, never to Postgres.
4. **Webhooks are authenticated.** Both the provider-side `apikey` and the
   instance-existence check live in `WebhookGuard`.
5. **Provider sessions are persisted** to a Docker volume — otherwise every
   restart asks for a fresh QR.
6. **Inbound message content is data, not commands.** Never interpret it as
   logic — protects against prompt-injection if an LLM is added later.
7. **Conversations are owned by your DB**, not by the provider. Losing a
   number must mean losing a channel, not losing the history.

See [CLAUDE.md](CLAUDE.md) for the full project brief (used by Claude Code
during development).

## Development

```bash
pnpm install
pnpm build:shared          # builds @waflow/shared

# DB + object storage in Docker, apps locally
docker compose -f infra/docker-compose.yml --env-file .env up -d \
  postgres minio minio-init redis evolution_postgres evolution

pnpm --filter @waflow/backend prisma:generate
pnpm --filter @waflow/backend prisma:deploy

pnpm dev:backend           # http://localhost:3001
pnpm dev:frontend          # http://localhost:3002
```

Pre-commit:
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Security notes

- Passwords: **argon2id**. Sessions: JWT in httpOnly cookies, `SameSite=Lax`,
  `Secure` when `NODE_ENV=production`.
- Webhook origin: secret `EVOLUTION_WEBHOOK_SECRET` (= `EVOLUTION_API_KEY` by
  default) checked against `apikey` in the payload, plus per-instance
  `providerKey` is captured on first call and pinned thereafter.
- Secrets live in `.env` — never committed (verified in `.gitignore`).
- Transport: HTTPS through Cloudflare Tunnel for prod. Local: HTTP on
  `localhost:8080`.

## License

[MIT](LICENSE) — do what you want, no warranty.

## Contributing

Issues and PRs welcome. Please keep within the design rules above — in
particular, **no marketing-automation features** will be merged. The whole
point of this project is the anti-ban posture.
