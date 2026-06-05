'use client';

import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents } from '@waflow/shared';

let socket: Socket<ServerToClientEvents> | null = null;

/**
 * Singleton socket. We do not pass a URL — the client uses the same origin
 * the frontend was loaded from. The reverse-proxy (Caddy) routes /socket.io/*
 * to the backend, including the WebSocket upgrade.
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
