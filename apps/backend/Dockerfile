# Backend (NestJS). Build context is the repo root.
FROM node:22-bookworm-slim

# Native deps (argon2) + openssl required by Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

WORKDIR /app

# Workspace manifests — used to cache the install layer.
# We deliberately do NOT copy pnpm-lock.yaml here: --no-frozen-lockfile lets
# pnpm pick the hoisted layout from .npmrc cleanly when resolving fresh.
COPY pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --no-frozen-lockfile --config.node-linker=hoisted

# Sources.
COPY packages/shared packages/shared
COPY apps/backend apps/backend

# Build shared by running tsc directly (avoid pnpm --filter quirks under hoisted layout)
RUN cd packages/shared && ../../node_modules/.bin/tsc -p tsconfig.json \
  && cd /app/apps/backend \
  && ../../node_modules/.bin/prisma generate \
  && ../../node_modules/.bin/nest build

WORKDIR /app/apps/backend
EXPOSE 3001

# Apply migrations, then start (the admin is auto-seeded on bootstrap).
CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy && node dist/main.js"]
