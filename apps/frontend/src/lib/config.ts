/**
 * Base API prefix. All calls are relative — same origin as the frontend.
 * The reverse-proxy (Caddy) routes /api/* to the backend.
 *
 * Benefits: no CORS, cookies/Socket.io just work, a single URL serves
 * localhost / LAN / Cloudflare-tunnel scenarios.
 */
export const API_PREFIX = '/api';
