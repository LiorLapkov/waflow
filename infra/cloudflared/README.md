# Cloudflare Tunnel (template)

HTTPS access to the panel without port forwarding and with the home server's
real IP hidden.

## Quick start

1. Install `cloudflared` on the server.
2. Authenticate: `cloudflared tunnel login`.
3. Create the tunnel: `cloudflared tunnel create waflow` → you'll get a
   `<TUNNEL_ID>.json` credentials file. Place it next to this README; it is
   listed in `.gitignore` (secret, never committed).
4. Copy `config.example.yml` → `config.yml` and fill in your domain and
   TUNNEL_ID.
5. Bind DNS: `cloudflared tunnel route dns waflow inbox.example.com`.
6. Run: `cloudflared tunnel run waflow` (or install as a systemd service).

The tunnel proxies to the Caddy reverse-proxy on `localhost:8080`, which then
routes `/api/*` and `/socket.io/*` to the backend and everything else to the
frontend — a single hostname covers the whole stack.
