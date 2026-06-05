import { z } from 'zod';

/** Тип содержимого сообщения WhatsApp. */
export const MessageType = {
  Text: 'text',
  Image: 'image',
  Document: 'document',
  Voice: 'voice',
  Video: 'video',
} as const;
export const messageTypeSchema = z.enum([
  MessageType.Text,
  MessageType.Image,
  MessageType.Document,
  MessageType.Voice,
  MessageType.Video,
]);
export type MessageType = z.infer<typeof messageTypeSchema>;

/** Направление сообщения относительно нашего номера. */
export const MessageDirection = {
  Inbound: 'inbound',
  Outbound: 'outbound',
} as const;
export const messageDirectionSchema = z.enum([
  MessageDirection.Inbound,
  MessageDirection.Outbound,
]);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;

/** Статус доставки сообщения. */
export const MessageStatus = {
  Pending: 'pending',
  Sent: 'sent',
  Delivered: 'delivered',
  Read: 'read',
  Failed: 'failed',
} as const;
export const messageStatusSchema = z.enum([
  MessageStatus.Pending,
  MessageStatus.Sent,
  MessageStatus.Delivered,
  MessageStatus.Read,
  MessageStatus.Failed,
]);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

/** Роль пользователя панели. */
export const UserRole = {
  Admin: 'admin',
  Operator: 'operator',
} as const;
export const userRoleSchema = z.enum([UserRole.Admin, UserRole.Operator]);
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * Статус WAHA-сессии (нормализованный набор; WAHA отдаёт строки в верхнем регистре,
 * нормализуем на бэкенде).
 */
export const SessionStatus = {
  Starting: 'starting',
  ScanQr: 'scan_qr',
  Working: 'working',
  Failed: 'failed',
  Stopped: 'stopped',
} as const;
export const sessionStatusSchema = z.enum([
  SessionStatus.Starting,
  SessionStatus.ScanQr,
  SessionStatus.Working,
  SessionStatus.Failed,
  SessionStatus.Stopped,
]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
