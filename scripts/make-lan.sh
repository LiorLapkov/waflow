#!/usr/bin/env bash
# Make the stack reachable from other devices on the same network
# (e.g. an operator's phone joining your laptop's hotspot).
#
# What it does:
#   1. Detects the LAN IP of the active interface (Wi-Fi / Ethernet / hotspot).
#   2. Updates .env:
#        FRONTEND_ORIGIN     — adds http://<LAN-IP>:3002 (next to localhost)
#        NEXT_PUBLIC_API_URL — http://<LAN-IP>:3001 (baked into the frontend build)
#   3. Rebuilds frontend and restarts backend+frontend.
#
# After this, from a phone on the same network open:
#   http://<LAN-IP>:3002
#
# To switch back to localhost-only mode — ./scripts/make-local.sh

set -e
cd "$(dirname "$0")/.."

# 1) Detect the LAN IP
detect_ip() {
  # macOS: en0 (Wi-Fi), en1 (Ethernet/hotspot), bridge100 (Internet Sharing)
  for IFACE in en0 en1 en2 bridge100 bridge0; do
    IP=$(ipconfig getifaddr "$IFACE" 2>/dev/null || true)
    if [ -n "$IP" ]; then echo "$IP"; return; fi
  done
  # Linux fallback
  IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  [ -n "$IP" ] && echo "$IP"
}

LAN_IP=$(detect_ip)
if [ -z "$LAN_IP" ]; then
  echo "❌ Could not detect a LAN IP. Connect to Wi-Fi or start your hotspot and rerun." >&2
  exit 1
fi
echo "✓ LAN IP: $LAN_IP"

# 2) Update .env
if [ ! -f .env ]; then
  echo "❌ .env not found. Copy .env.example → .env and fill in secrets." >&2
  exit 1
fi

FRONT_PORT=$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2)
FRONT_PORT=${FRONT_PORT:-3002}
BACK_PORT=$(grep -E '^BACKEND_PORT=' .env | cut -d= -f2)
BACK_PORT=${BACK_PORT:-3001}

FRONT_ORIGIN_VAL="http://localhost:$FRONT_PORT,http://$LAN_IP:$FRONT_PORT"
API_URL_VAL="http://$LAN_IP:$BACK_PORT"

upsert() {
  KEY=$1; VAL=$2
  if grep -qE "^${KEY}=" .env; then
    ESC=$(printf '%s\n' "$VAL" | sed 's/[\/&]/\\&/g')
    sed -i.bak "s/^${KEY}=.*/${KEY}=${ESC}/" .env && rm -f .env.bak
  else
    printf '\n%s=%s\n' "$KEY" "$VAL" >> .env
  fi
}

upsert FRONTEND_ORIGIN "$FRONT_ORIGIN_VAL"
upsert NEXT_PUBLIC_API_URL "$API_URL_VAL"

echo "✓ .env updated:"
echo "    FRONTEND_ORIGIN     = $FRONT_ORIGIN_VAL"
echo "    NEXT_PUBLIC_API_URL = $API_URL_VAL"
echo

# 3) Rebuild frontend (NEXT_PUBLIC_API_URL is baked at build time)
echo "=== Rebuilding backend + frontend ==="
docker compose -f infra/docker-compose.yml --env-file .env up -d --build backend frontend

echo
echo "🎉 Done."
echo "On a phone on the same network / your hotspot, open:"
echo "    http://$LAN_IP:$FRONT_PORT"
echo
echo "⚠️  If the page doesn't load from the phone, check:"
echo "    1. macOS firewall isn't blocking inbound connections"
echo "       (System Settings → Network → Firewall → allow Docker)"
echo "    2. The phone is on the SAME network as this laptop"
echo "    3. From the phone, ping $LAN_IP (any network tester)"
