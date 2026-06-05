# Cloudflare Tunnel (заготовка)

HTTPS-доступ к панели без проброса портов и со скрытым IP домашнего сервера.

## Быстрый старт

1. Установи `cloudflared` на сервере.
2. Авторизуйся: `cloudflared tunnel login`.
3. Создай туннель: `cloudflared tunnel create dljobs-crm` → получишь `<TUNNEL_ID>.json`
   (credentials). Положи его рядом, он в `.gitignore` (секрет, в репозиторий НЕ коммитим).
4. Скопируй `config.example.yml` → `config.yml` и подставь домен и TUNNEL_ID.
5. Привяжи DNS: `cloudflared tunnel route dns dljobs-crm crm.example.com`.
6. Запусти: `cloudflared tunnel run dljobs-crm` (или systemd-сервис).

Туннель проксирует на `frontend` (панель). Бэкенд-API можно отдать на отдельный
поддомен или через path — настраивается в `config.yml` (`ingress`).
