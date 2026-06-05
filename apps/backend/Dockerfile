# Backend (NestJS). Контекст сборки — корень репозитория.
FROM node:22-bookworm-slim

# Нативные зависимости (argon2) + openssl для Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

WORKDIR /app

# Манифесты воркспейса — для кэширования установки.
COPY pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --no-frozen-lockfile

# Исходники.
COPY packages/shared packages/shared
COPY apps/backend apps/backend

RUN pnpm --filter @dljobs/shared build \
  && pnpm --filter @dljobs/backend exec prisma generate \
  && pnpm --filter @dljobs/backend build

WORKDIR /app/apps/backend
EXPOSE 3001

# Применяем миграции, затем стартуем (админ создаётся авто-сидом при bootstrap).
CMD ["sh", "-c", "pnpm prisma:deploy:docker && node dist/main.js"]
