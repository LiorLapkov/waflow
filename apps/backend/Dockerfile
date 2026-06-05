# Backend (NestJS). Build context is the repo root.
FROM node:22-bookworm-slim

# Native deps (argon2) + openssl required by Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

WORKDIR /app

# Workspace manifests — used to cache the install layer.
COPY pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --no-frozen-lockfile

# Sources.
COPY packages/shared packages/shared
COPY apps/backend apps/backend

RUN pnpm --filter @waflow/shared build \
  && pnpm --filter @waflow/backend exec prisma generate \
  && pnpm --filter @waflow/backend build

WORKDIR /app/apps/backend
EXPOSE 3001

# Apply migrations, then start (the admin is auto-seeded on bootstrap).
CMD ["sh", "-c", "pnpm prisma:deploy:docker && node dist/main.js"]
