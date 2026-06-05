# Deploying waflow on an Ubuntu server

Step-by-step guide to running waflow on your own Linux server. Tested on
Ubuntu 24.04 LTS (x86_64). Should work on 22.04 LTS as well.

## What you get

- Stack runs on your machine 24/7
- External access via **Cloudflare Tunnel** (free HTTPS, no static IP needed)
- Updates with a single `./scripts/server-update.sh`
- **Evolution API** (Baileys) on native Linux x86_64 — multiple numbers, no
  licence cost

## 1. Prepare the server (one-time)

### 1.1. Docker + Compose

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com | sudo sh

# Allow yourself to run docker without sudo
sudo usermod -aG docker $USER

# ⚠️ Log out and back in for the group change to apply
exit
```

After re-login, verify:
```bash
docker --version
docker compose version
```

### 1.2. Prevent the machine from sleeping (laptops in particular)

```bash
# Disable all sleep targets
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# If it's a laptop with the lid usually closed:
sudo sed -i 's/#HandleLidSwitch=suspend/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind

# Make sure Docker comes back automatically after reboot
sudo systemctl enable docker
```

### 1.3. cloudflared

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared --version
```

## 2. Get the code

```bash
cd ~
git clone https://github.com/<your-user>/waflow.git
cd waflow
```

(Replace `<your-user>` with the GitHub account where the repo lives.)

## 3. Bring in your `.env`

`.env` contains secrets — never committed. Transfer it from your dev machine:

**Option A — USB stick:**
- Copy `.env` from your dev machine onto a stick
- On the server: place it at `~/waflow/.env`
- `chmod 600 ~/waflow/.env`

**Option B — scp from your dev machine:**
```bash
scp /path/to/local/.env user@server-ip:~/waflow/.env
ssh user@server-ip 'chmod 600 ~/waflow/.env'
```

**Important:** keep `BACKEND_PUBLIC_URL=http://backend:3001` — that's the
internal container address and shouldn't change.

## 4. First boot

```bash
cd ~/waflow
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

First build takes 5–10 minutes (Docker pulls images + builds backend + frontend).

Sanity check:
```bash
docker compose -f infra/docker-compose.yml --env-file .env ps
```
All services should be `Up`; postgres/minio also `healthy`.

Confirm the panel loads locally:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/healthz   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/login     # 200
```

## 5. Cloudflare Tunnel

### Quick Tunnel (no account, ephemeral URL)

```bash
cloudflared tunnel --url http://localhost:8080
```

In the output you'll see `https://<random>.trycloudflare.com` — that's your
public URL. **As long as this process is alive, the tunnel works.** Open the
URL on any device.

⚠️ The URL changes every time you restart the tunnel. For production use the
named-tunnel setup below.

### Persistent URL (recommended for prod)

You need a **domain name** (≈ $10/year on Namecheap, GoDaddy, Cloudflare
Registrar, etc.).

```bash
# Log in to Cloudflare (opens a browser tab to authorise)
cloudflared tunnel login

# Create the tunnel
cloudflared tunnel create waflow

# Bind it to a hostname (e.g. inbox.example.com)
cloudflared tunnel route dns waflow inbox.example.com

# Create the config
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

`/etc/cloudflared/config.yml`:
```yaml
tunnel: waflow
credentials-file: /home/<your-user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: inbox.example.com
    service: http://localhost:8080
  - service: http_status:404
```

Install as a systemd service (auto-start on boot):
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
sudo systemctl status cloudflared
```

Done — `https://inbox.example.com` is now your panel, 24/7.

## 6. Linking WhatsApp numbers

1. Open the panel at `http://localhost:8080` (from the server) or your tunnel
   URL (from any device).
2. Log in as admin (credentials = `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`).
3. Hit **"+ Connect number"** → give it a name → scan the QR with your phone
   (**WhatsApp → Linked devices → Link a device**).
4. Repeat for each number.

Any number you create later is automatically visible to every operator. You
can narrow that down per operator in `/admin`.

## 7. Updating after code changes

On the dev machine:
```bash
git add .
git commit -m "feat: something"
git push
```

On the server:
```bash
cd ~/waflow
./scripts/server-update.sh
```

The script does `git pull`, rebuilds backend/frontend, and restarts those
containers. The DB and WhatsApp sessions are preserved — no re-linking
required.

## 8. Backups (set once, forget)

Daily dump of Postgres + Evolution session state:

```bash
sudo nano /etc/cron.daily/waflow-backup
```

```bash
#!/bin/bash
BACKUP_DIR=/home/<your-user>/waflow-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec infra-postgres-1 pg_dump -U waflow waflow | gzip > $BACKUP_DIR/db_$DATE.sql.gz
docker run --rm -v infra_evolution_instances:/data -v $BACKUP_DIR:/backup alpine \
  tar czf /backup/evolution_$DATE.tar.gz -C /data .
# keep the last 14 days
find $BACKUP_DIR -name '*.gz' -mtime +14 -delete
```

```bash
sudo chmod +x /etc/cron.daily/waflow-backup
```

Push these to remote storage (Google Drive / Backblaze B2) with `rclone` if
you want off-site copies — optional.

## 9. Troubleshooting

```bash
# Tail logs
docker compose -f infra/docker-compose.yml --env-file .env logs -f backend
docker compose -f infra/docker-compose.yml --env-file .env logs -f evolution

# Restart one service
docker compose -f infra/docker-compose.yml --env-file .env restart backend

# Restart everything
docker compose -f infra/docker-compose.yml --env-file .env restart

# Free disk space (remove dangling images)
docker system prune -f
```

## Common changes later

- **Change the admin password?** Delete the user in Postgres
  (`DELETE FROM users WHERE username='lior'`), update `ADMIN_PASSWORD` in
  `.env`, restart the backend — it'll be recreated.
- **Add operators?** In the UI at `/admin`.
- **Rotate secrets?** Update `.env`, then
  `docker compose ... up -d --force-recreate`. Existing WhatsApp sessions
  will need re-linking.
