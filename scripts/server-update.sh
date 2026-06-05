#!/usr/bin/env bash
# Single-command update for the production install on the server.
# Run on the server after a `git push` from your dev machine.
#
# What it does:
#   1. git pull (latest code)
#   2. Rebuild backend + frontend
#   3. Apply Prisma migrations (inside the backend Dockerfile CMD)
#   4. Restart the updated services
#
# DB, MinIO media and WhatsApp sessions (Evolution) are preserved — no
# re-linking needed.

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env not found. Copy it from your dev machine." >&2
  exit 1
fi

echo "=== git pull ==="
git pull --ff-only

echo
echo "=== rebuilding backend + frontend ==="
docker compose -f infra/docker-compose.yml --env-file .env build backend frontend

echo
echo "=== restarting changed services ==="
docker compose -f infra/docker-compose.yml --env-file .env up -d backend frontend

echo
echo "=== sanity check ==="
sleep 3
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/login 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "✓ panel is responding (${i}s)"
    break
  fi
  sleep 1
done

echo
docker compose -f infra/docker-compose.yml --env-file .env ps --format 'table {{.Service}}\t{{.Status}}'
echo
echo "Done. Logs: docker compose -f infra/docker-compose.yml --env-file .env logs -f backend"
