#!/usr/bin/env bash
# Cloudflare Quick Tunnel — public HTTPS URL without a Cloudflare account.
# Run:  ./scripts/tunnel.sh
# Stop: Ctrl+C
#
# The URL is randomly generated and only lives while this process is running.
# Each run gets a different URL.

set -e

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "❌ cloudflared is not installed. Install:  brew install cloudflared" >&2
  exit 1
fi

# Make sure Caddy on :8080 is alive
if ! curl -sf http://localhost:8080/healthz >/dev/null 2>&1; then
  echo "❌ Caddy on :8080 is not responding. Bring the stack up first:"
  echo "   docker compose -f infra/docker-compose.yml --env-file .env up -d"
  exit 1
fi

echo "✓ Caddy is up, starting the tunnel…"
echo "   (the URL appears in 2–5 seconds, look for the trycloudflare.com line)"
echo
exec cloudflared tunnel --url http://localhost:8080
