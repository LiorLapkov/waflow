#!/usr/bin/env bash
# Подготовка проекта к доступу с других устройств в той же сети
# (например, телефон оператора через раздачу интернета с этого ноута).
#
# Что делает:
#   1. Определяет LAN-IP активного интерфейса (Wi-Fi / Ethernet / hotspot).
#   2. Обновляет в .env переменные:
#        FRONTEND_ORIGIN     — добавляет http://<LAN-IP>:3002 (рядом с localhost)
#        NEXT_PUBLIC_API_URL — http://<LAN-IP>:3001 (вшивается в сборку фронта)
#   3. Пересобирает frontend и перезапускает backend+frontend.
#
# После этого с телефона в той же сети открываешь:
#   http://<LAN-IP>:3002
#
# Чтобы вернуть локальный режим — запусти ./scripts/make-local.sh

set -e
cd "$(dirname "$0")/.."

# 1) Определяем LAN-IP
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
  echo "❌ Не удалось определить LAN-IP. Подключись к Wi-Fi или включи раздачу интернета и повтори." >&2
  exit 1
fi
echo "✓ LAN-IP: $LAN_IP"

# 2) Обновляем .env
if [ ! -f .env ]; then
  echo "❌ Файл .env не найден. Скопируй .env.example → .env и заполни секреты." >&2
  exit 1
fi

FRONT_PORT=$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2)
FRONT_PORT=${FRONT_PORT:-3002}
BACK_PORT=$(grep -E '^BACKEND_PORT=' .env | cut -d= -f2)
BACK_PORT=${BACK_PORT:-3001}

FRONT_ORIGIN_VAL="http://localhost:$FRONT_PORT,http://$LAN_IP:$FRONT_PORT"
API_URL_VAL="http://$LAN_IP:$BACK_PORT"

# Обновляем (или добавляем) переменные. macOS sed: -i ''
upsert() {
  KEY=$1; VAL=$2
  if grep -qE "^${KEY}=" .env; then
    # экранируем спец-символы для sed
    ESC=$(printf '%s\n' "$VAL" | sed 's/[\/&]/\\&/g')
    sed -i.bak "s/^${KEY}=.*/${KEY}=${ESC}/" .env && rm -f .env.bak
  else
    printf '\n%s=%s\n' "$KEY" "$VAL" >> .env
  fi
}

upsert FRONTEND_ORIGIN "$FRONT_ORIGIN_VAL"
upsert NEXT_PUBLIC_API_URL "$API_URL_VAL"

echo "✓ .env обновлён:"
echo "    FRONTEND_ORIGIN     = $FRONT_ORIGIN_VAL"
echo "    NEXT_PUBLIC_API_URL = $API_URL_VAL"
echo

# 3) Пересборка фронта (URL API вшивается на этапе билда Next.js)
echo "=== Пересборка backend + frontend ==="
docker compose -f infra/docker-compose.yml --env-file .env up -d --build backend frontend

echo
echo "🎉 Готово."
echo "На телефоне (подключённом к этой же сети / точке доступа этого ноута) открой:"
echo "    http://$LAN_IP:$FRONT_PORT"
echo
echo "⚠️  Если страница не открывается с телефона, проверь:"
echo "    1. macOS Firewall не блокирует входящие подключения"
echo "       (System Settings → Network → Firewall → Options → разрешить com.docker.backend)"
echo "    2. Телефон подключён к ТОЙ ЖЕ сети, что и ноут"
echo "    3. ping $LAN_IP с телефона (тестер сети)"
