# Frontend (Next.js, standalone). Контекст сборки — корень репозитория.
FROM node:22-bookworm-slim AS builder

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --no-frozen-lockfile

COPY packages/shared packages/shared
COPY apps/frontend apps/frontend

RUN pnpm --filter @dljobs/shared build \
  && pnpm --filter @dljobs/frontend build

# ── Runtime ──────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Standalone-сборка тащит только нужные node_modules.
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3002
CMD ["node", "apps/frontend/server.js"]
