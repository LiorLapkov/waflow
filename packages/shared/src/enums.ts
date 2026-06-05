import { z } from 'zod';

/** WhatsApp message content type. */
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

/** Direction of the message relative to our number. */
export const MessageDirection = {
  Inbound: 'inbound',
  Outbound: 'outbound',
} as const;
export const messageDirectionSchema = z.enum([
  MessageDirection.Inbound,
  MessageDirection.Outbound,
]);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;

/** Delivery status. */
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

/** User role inside the panel. */
export const UserRole = {
  Admin: 'admin',
  Operator: 'operator',
} as const;
export const userRoleSchema = z.enum([UserRole.Admin, UserRole.Operator]);
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * Normalized WhatsApp session status. The provider may emit raw strings in
 * different casings — they are normalized to this set on the backend.
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
