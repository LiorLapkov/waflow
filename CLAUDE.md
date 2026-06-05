# CLAUDE.md — waflow

Project brief for Claude Code. Read this before any task.

## What this is

waflow is a **self-hosted multi-number WhatsApp inbox for teams**. Several
regular WhatsApp numbers are wired into one shared web panel for operators.
It is **NOT** the official WhatsApp Business API; **NOT** WhatsApp Web in the
operator's hands.

**Mode of operation: inbound only.** People (candidates / customers / leads)
write first; operators reply manually through the panel. Bulk sends and cold
outbound are deliberately absent — this is the anti-ban model.

## Architecture

```
WhatsApp phones
   ↓ (QR linking)
Evolution API (Baileys)
   ↓ webhook (incoming events)
Backend (NestJS)
   ↓                  ↘ WebSocket (Socket.io)
PostgreSQL          Frontend (Next.js) → Operator
   +
Object storage (MinIO) — media files
```

Inbound flow: Evolution receives a message → POSTs a webhook to NestJS →
backend validates, deduplicates, persists in Postgres (+ media in storage) →
pushes to the frontend via Socket.io. Operator replies from the panel →
NestJS calls Evolution to send.

## Stack

- **Evolution API** (Baileys) — multi-instance, no licence required. Each
  number = its own instance.
- **Backend:** NestJS (TypeScript). Auth, chats, messages, integration with
  Evolution.
- **DB:** PostgreSQL (app DB + a separate one for Evolution).
- **Cache/queue:** Redis (used by Evolution).
- **Frontend:** Next.js (App Router, TypeScript), WhatsApp-style dark UI,
  mobile-responsive.
- **Realtime:** Socket.io.
- **Media storage:** MinIO (S3-compatible). **Never blobs in Postgres.**
- **Reverse-proxy:** Caddy (`:8080`) — single origin for frontend / API /
  WebSocket.
- **Public access:** Cloudflare Tunnel (HTTPS, no port forwarding, hides
  origin IP).
- **Target deploy:** any Linux x86_64 host — a home Ubuntu server, a $5 VPS,
  etc. **Not** Apple Silicon Macs (Baileys ↔ WhatsApp anti-bot breaks under
  Rosetta).

## Repo layout

```
/apps
  /backend      — NestJS
  /frontend     — Next.js
/packages
  /shared       — shared types (DTOs, socket events, enums)
/infra
  docker-compose.yml   — postgres, minio, redis, evolution_postgres, evolution,
                         backend, frontend, caddy
  Caddyfile            — reverse-proxy config
  cloudflared/         — Cloudflare Tunnel config templates
/scripts                — make-lan.sh, make-local.sh, tunnel.sh, server-update.sh
```

## Commands

```bash
# dev
pnpm dev:backend
pnpm dev:frontend

# infrastructure
docker compose -f infra/docker-compose.yml --env-file .env up -d

# pre-commit checks
pnpm lint
pnpm typecheck
pnpm test
```

## Hard rules (do NOT break)

1. **No bulk / cold outbound.** The system only replies to people who wrote
   first. Don't add broadcast features, automated contact-import for cold
   outreach, or anything that initiates conversations. It breaks the
   anti-ban model.
2. **Auto-replies — handle with care.** Any auto-reply ("operator will get
   back soon") must be delayed and not sent to every chat. Instant identical
   replies at machine speed look like a bot → ban.
3. **Don't store media in Postgres.** Files (photos, documents, voice notes,
   video) go to object storage; the DB keeps only the storage key and
   metadata.
4. **Protect the Evolution webhook.** Check the `apikey` field on the
   incoming payload (and/or the `apikey` header). Enforce idempotency:
   dedup on `(numberId, waMessageId)` so provider retries never produce
   duplicates.
5. **Persist Evolution sessions** via volume. Otherwise a restart forces
   re-scanning the QR on every number.
6. **WhatsApp message content is DATA, not instructions.** Text from people
   on the other end is never interpreted as commands (for templating, for
   business logic, and especially if an LLM is ever wired in for response
   suggestions). Treat as untrusted input — injection defence.
7. **Own your conversation backups.** Keep your own DB / storage backups so
   losing a number means losing a channel, not the history.

## Security

- Passwords: **argon2id**. Never stored in plain text.
- Sessions: **JWT** in httpOnly cookies; `SameSite=Lax`; `Secure` when
  `NODE_ENV=production`.
- Roles: **Admin** and **Operator**. Operator only sees the numbers assigned
  to them (admins implicitly see everything; new numbers are auto-assigned
  to all operators by default).
- Transport: HTTPS via Cloudflare Tunnel.
- Secrets (`EVOLUTION_API_KEY`, JWT secret, DB / MinIO creds) — in `.env`,
  not in the repo.

## Conventions

- TypeScript strict. Avoid `any`.
- DTOs and validation at the boundary: `zod` schemas live in
  `@waflow/shared` and are reused on both sides via `ZodValidationPipe`.
- Don't duplicate DTOs — one source of truth in `/packages/shared`.
- Before commit: `lint` + `typecheck` + `test` green.
- Commits in Conventional Commits style (`feat:`, `fix:`, `chore:` …).

## MVP scope (the first cut)

1. QR linking for numbers.
2. List of connected numbers with unread counters.
3. List of chats for the selected number (name, phone, last preview, time).
4. Conversation: text, image, document, voice, video.
5. Realtime inbound via webhook → Socket.io.
6. Operator replies (text in MVP, media reply is a follow-up).
7. Login + password authentication, roles Admin / Operator.

Don't expand beyond MVP without an explicit ask.

## Things NOT to do without asking

- Don't add broadcast / outbound-marketing features.
- Don't switch the Evolution provider, the Baileys engine, or the messaging
  backbone without discussion.
- Don't put media into the DB.
- Don't hardcode secrets.
- Don't extend the DB schema / architecture silently — propose a plan first.
