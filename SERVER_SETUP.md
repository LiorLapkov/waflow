# Развёртывание на Ubuntu-сервере

Полная пошаговая инструкция для запуска DLJobs WhatsApp CRM на собственном Ubuntu-сервере (тестировано на Ubuntu 24.04 LTS, x86_64).

## Что получится

- Стек живёт на твоём сервере 24/7
- Доступ снаружи через **Cloudflare Tunnel** (бесплатный HTTPS, без статического IP)
- Обновления — одной командой `./scripts/server-update.sh`
- **Evolution API** (Baileys) на нативном Linux x86_64 — поддерживает несколько номеров без лицензии

## 1. Подготовка сервера (один раз)

### 1.1. Docker и Compose

```bash
# Установка Docker Engine
curl -fsSL https://get.docker.com | sudo sh

# Добавить себя в группу docker (чтобы не писать sudo каждый раз)
sudo usermod -aG docker $USER

# ⚠️ Перелогиниться (выйти и зайти по ssh заново)
exit
```

После перелогина проверь:
```bash
docker --version
docker compose version
```

### 1.2. Запретить серверу засыпать (для ноутбука)

```bash
# Не уходить в sleep
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# Если это ноут с закрытой крышкой — не выключаться при закрытии
sudo sed -i 's/#HandleLidSwitch=suspend/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind

# Docker должен сам стартовать после ребута
sudo systemctl enable docker
```

### 1.3. Cloudflare Tunnel

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared --version
```

## 2. Получить код

```bash
cd ~
git clone https://github.com/<твой-username>/whatsappFlow.git
cd whatsappFlow
```

(Замени `<твой-username>` на свой ник на GitHub.)

## 3. Перенести `.env`

`.env` содержит секреты — в репозиторий не коммитится. Перенести с локального Mac:

**Вариант A — флешка** (как ты планировал):
- На Mac скопировать `/Users/lior/Desktop/whatsappFlow/.env` на флешку
- На сервере положить в `~/whatsappFlow/.env`
- `chmod 600 ~/whatsappFlow/.env`

**Вариант B — scp**:
```bash
# С Mac
scp /Users/lior/Desktop/whatsappFlow/.env user@server-ip:~/whatsappFlow/.env
ssh user@server-ip 'chmod 600 ~/whatsappFlow/.env'
```

**Важно**: после переноса проверь что `BACKEND_PUBLIC_URL=http://backend:3001` (это внутренний адрес контейнеров — менять не нужно).

## 4. Первый запуск

```bash
cd ~/whatsappFlow
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

Первая сборка займёт 5–10 минут (Docker подтянет образы + соберёт backend и frontend).

Проверка что всё ок:
```bash
docker compose -f infra/docker-compose.yml --env-file .env ps
```
Все сервисы должны быть `Up` (postgres, minio — `healthy`).

Проверка веб-доступа локально:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/healthz   # ожидаем 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/login     # ожидаем 200
```

## 5. Cloudflare Tunnel

### Quick Tunnel (без аккаунта, временный URL)

```bash
cloudflared tunnel --url http://localhost:8080
```

В выводе появится `https://<рандом>.trycloudflare.com` — это твой публичный URL. **Пока процесс жив — туннель работает.** Открой в браузере с любого устройства.

⚠️ URL меняется при каждом перезапуске. Для прода — см. следующий раздел.

### Postоянный URL (рекомендую для прода)

Нужен **домен** (можно купить за $10/год на Namecheap / GoDaddy / Cloudflare Registrar).

```bash
# Логин в Cloudflare (откроет браузер с подтверждением)
cloudflared tunnel login

# Создать туннель
cloudflared tunnel create dljobs-crm

# Привязать к домену (например crm.example.com)
cloudflared tunnel route dns dljobs-crm crm.example.com

# Создать конфиг
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Содержимое `/etc/cloudflared/config.yml`:
```yaml
tunnel: dljobs-crm
credentials-file: /home/<твой-user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: crm.example.com
    service: http://localhost:8080
  - service: http_status:404
```

Поставить как сервис (авто-старт при ребуте):
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
sudo systemctl status cloudflared
```

Готово — `https://crm.example.com` работает 24/7.

## 6. Линковка WhatsApp-номеров

1. Открой панель — `http://localhost:8080` (с сервера) или `https://<твой-туннель>` (с любого устройства)
2. Войди как админ (логин/пароль из `.env`: `ADMIN_USERNAME` / `ADMIN_PASSWORD`)
3. **«+ Подключить номер»** → задай название → отсканируй QR с телефона WhatsApp → **Связанные устройства → Привязать устройство**
4. Повтори для каждого из 5 номеров

Все номера автоматически назначаются всем операторам (это поведение можно изменить в `/admin`).

## 7. Обновление кода после правок

На локальной машине:
```bash
git add .
git commit -m "feat: что-то"
git push
```

На сервере:
```bash
cd ~/whatsappFlow
./scripts/server-update.sh
```

Скрипт сам сделает `git pull`, пересоберёт backend/frontend и перезапустит контейнеры. БД и сессии WhatsApp сохраняются — пере-линковка не нужна.

## 8. Бэкап (раз настроить — забыть)

В кроне раз в день — дамп Postgres и сессии Evolution в архив:

```bash
sudo nano /etc/cron.daily/dljobs-backup
```

Содержимое:
```bash
#!/bin/bash
BACKUP_DIR=/home/<твой-user>/dljobs-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec infra-postgres-1 pg_dump -U dljobs dljobs | gzip > $BACKUP_DIR/db_$DATE.sql.gz
docker run --rm -v infra_evolution_instances:/data -v $BACKUP_DIR:/backup alpine \
  tar czf /backup/evolution_$DATE.tar.gz -C /data .
# хранить последние 14 дней
find $BACKUP_DIR -name '*.gz' -mtime +14 -delete
```

```bash
sudo chmod +x /etc/cron.daily/dljobs-backup
```

Можно сразу залить эти бэкапы в облако (Google Drive / Backblaze B2) через `rclone` — но это уже опционально.

## 9. Если что-то не работает

```bash
# Логи в реальном времени
docker compose -f infra/docker-compose.yml --env-file .env logs -f backend
docker compose -f infra/docker-compose.yml --env-file .env logs -f evolution

# Перезапустить только один сервис
docker compose -f infra/docker-compose.yml --env-file .env restart backend

# Полный рестарт всех
docker compose -f infra/docker-compose.yml --env-file .env restart

# Освободить место (удалить старые образы)
docker system prune -f
```

## Что меняется потом

- **Хочешь сменить пароль админа?** Удали юзера в Postgres (`DELETE FROM users WHERE username='lior'`), смени `ADMIN_PASSWORD` в `.env`, перезапусти backend — пересоздастся.
- **Добавить операторов?** В UI на `/admin`.
- **Поменять секреты?** Замени в `.env`, перезапусти все: `docker compose ... up -d --force-recreate`. Существующие сессии нужно перелинковать.
