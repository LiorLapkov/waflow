#!/usr/bin/env bash
# Cloudflare Quick Tunnel — публичный HTTPS-URL без аккаунта.
# Запуск:  ./scripts/tunnel.sh
# Остановка: Ctrl+C
#
# URL генерируется случайным образом и существует ТОЛЬКО пока процесс жив.
# При следующем запуске будет другой URL.

set -e

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "❌ cloudflared не установлен. Поставь:  brew install cloudflared" >&2
  exit 1
fi

# Проверим что Caddy на 8080 жив
if ! curl -sf http://localhost:8080/healthz >/dev/null 2>&1; then
  echo "❌ Caddy на :8080 не отвечает. Сначала подними сервисы:"
  echo "   docker compose -f infra/docker-compose.yml --env-file .env up -d"
  exit 1
fi

echo "✓ Caddy жив, стартую туннель…"
echo "   (URL появится через 2–5 секунд, ищи строку trycloudflare.com)"
echo
exec cloudflared tunnel --url http://localhost:8080
