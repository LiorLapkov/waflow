#!/usr/bin/env bash
# Обновление прод-инсталляции на сервере одной командой.
# Использовать на сервере после `git push` с локальной машины.
#
# Что делает:
#   1. git pull (тянет свежий код)
#   2. Пересборка backend + frontend
#   3. Применение Prisma-миграций (внутри backend Dockerfile)
#   4. Рестарт обновлённых сервисов
#
# БД, MinIO-медиа и WhatsApp-сессии (Evolution) сохраняются — перелинковка не нужна.

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env не найден. Скопируй с локальной машины." >&2
  exit 1
fi

echo "=== git pull ==="
git pull --ff-only

echo
echo "=== пересборка backend + frontend ==="
docker compose -f infra/docker-compose.yml --env-file .env build backend frontend

echo
echo "=== перезапуск изменённых сервисов ==="
docker compose -f infra/docker-compose.yml --env-file .env up -d backend frontend

echo
echo "=== проверка ==="
sleep 3
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/login 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "✓ панель отвечает (${i}с)"
    break
  fi
  sleep 1
done

echo
docker compose -f infra/docker-compose.yml --env-file .env ps --format 'table {{.Service}}\t{{.Status}}'
echo
echo "Готово. Логи: docker compose -f infra/docker-compose.yml --env-file .env logs -f backend"
