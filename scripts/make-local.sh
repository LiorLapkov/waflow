#!/usr/bin/env bash
# Возврат к локальному режиму (только localhost, без LAN).
# Полезно когда демо/демо-сессия закончилась.

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env не найден" >&2
  exit 1
fi

FRONT_PORT=$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2)
FRONT_PORT=${FRONT_PORT:-3002}
BACK_PORT=$(grep -E '^BACKEND_PORT=' .env | cut -d= -f2)
BACK_PORT=${BACK_PORT:-3001}

upsert() {
  KEY=$1; VAL=$2
  if grep -qE "^${KEY}=" .env; then
    ESC=$(printf '%s\n' "$VAL" | sed 's/[\/&]/\\&/g')
    sed -i.bak "s/^${KEY}=.*/${KEY}=${ESC}/" .env && rm -f .env.bak
  else
    printf '\n%s=%s\n' "$KEY" "$VAL" >> .env
  fi
}

upsert FRONTEND_ORIGIN "http://localhost:$FRONT_PORT"
upsert NEXT_PUBLIC_API_URL "http://localhost:$BACK_PORT"

echo "✓ .env вернули в локальный режим"
echo "=== Пересборка ==="
docker compose -f infra/docker-compose.yml --env-file .env up -d --build backend frontend
echo
echo "Открой: http://localhost:$FRONT_PORT"
