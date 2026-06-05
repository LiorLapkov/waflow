'use client';

import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents } from '@dljobs/shared';

let socket: Socket<ServerToClientEvents> | null = null;

/**
 * Синглтон-сокет. URL не указываем — клиент подключится к тому же origin,
 * с которого загружен фронт. Реверс-прокси (Caddy) проксирует /socket.io/*
 * в backend, включая WebSocket-upgrade.
 */
export function getSocket(): Socket<ServerToClientEvents> {
  if (!socket) {
    socket = io({
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
