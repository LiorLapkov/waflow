import type { ChatDto, MessageDto, QrDto } from './dto.js';
import type { SessionStatus } from './enums.js';

/** Socket.io event names (server → client). */
export const SocketEvent = {
  MessageNew: 'message:new',
  ChatUpdated: 'chat:updated',
  SessionStatus: 'session:status',
  SessionQr: 'session:qr',
} as const;
export type SocketEventName = (typeof SocketEvent)[keyof typeof SocketEvent];

/** `message:new` payload. */
export interface MessageNewPayload {
  numberId: string;
  message: MessageDto;
}

/** `chat:updated` payload (preview / unread changed). */
export interface ChatUpdatedPayload {
  numberId: string;
  chat: ChatDto;
}

/** `session:status` payload. */
export interface SessionStatusPayload {
  numberId: string;
  status: SessionStatus;
  phone?: string | null;
}

/** `session:qr` payload. */
export type SessionQrPayload = QrDto;

/** Server-emitted event map for Socket.io typing. */
export interface ServerToClientEvents {
  [SocketEvent.MessageNew]: (p: MessageNewPayload) => void;
  [SocketEvent.ChatUpdated]: (p: ChatUpdatedPayload) => void;
  [SocketEvent.SessionStatus]: (p: SessionStatusPayload) => void;
  [SocketEvent.SessionQr]: (p: SessionQrPayload) => void;
}
