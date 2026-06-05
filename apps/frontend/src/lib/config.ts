/**
 * Базовый префикс API. Все вызовы — относительные, через тот же origin, что и фронт.
 * Маршрутизацию на backend делает реверс-прокси (Caddy) на /api/*.
 *
 * Преимущества: нет CORS, cookie/Socket.io работают «из коробки», один URL для
 * локалки/LAN/Cloudflare-туннеля.
 */
export const API_PREFIX = '/api';
