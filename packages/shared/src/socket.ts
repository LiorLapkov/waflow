import type { ChatDto, MessageDto, QrDto } from './dto.js';
import type { SessionStatus } from './enums.js';

/** Имена Socket.io событий (сервер → клиент). */
export const SocketEvent = {
  MessageNew: 'message:new',
  ChatUpdated: 'chat:updated',
  SessionStatus: 'session:status',
  SessionQr: 'session:qr',
} as const;
export type SocketEventName = (typeof SocketEvent)[keyof typeof SocketEvent];

/** Payload `message:new`. */
export interface MessageNewPayload {
  numberId: string;
  message: MessageDto;
}

/** Payload `chat:updated` (превью/непрочитанные изменились). */
export interface ChatUpdatedPayload {
  numberId: string;
  chat: ChatDto;
}

/** Payload `session:status`. */
export interface SessionStatusPayload {
  numberId: string;
  status: SessionStatus;
  phone?: string | null;
}

/** Payload `session:qr`. */
export type SessionQrPayload = QrDto;

/** Карта серверных событий для типизации Socket.io. */
export interface ServerToClientEvents {
  [SocketEvent.MessageNew]: (p: MessageNewPayload) => void;
  [SocketEvent.ChatUpdated]: (p: ChatUpdatedPayload) => void;
  [SocketEvent.SessionStatus]: (p: SessionStatusPayload) => void;
  [SocketEvent.SessionQr]: (p: SessionQrPayload) => void;
}
