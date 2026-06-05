import { z } from 'zod';
import {
  messageDirectionSchema,
  messageStatusSchema,
  messageTypeSchema,
  sessionStatusSchema,
  userRoleSchema,
} from './enums.js';

/** Panel user (without secrets). */
export const userDtoSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: userRoleSchema,
  createdAt: z.string(),
});
export type UserDto = z.infer<typeof userDtoSchema>;

/** A connected WhatsApp number. */
export const whatsappNumberDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Provider-side instance name (Evolution / Baileys). */
  wahaSession: z.string(),
  phone: z.string().nullable(),
  status: sessionStatusSchema,
  unreadCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type WhatsappNumberDto = z.infer<typeof whatsappNumberDtoSchema>;

/** A chat (one conversation tied to one number). */
export const chatDtoSchema = z.object({
  id: z.string(),
  numberId: z.string(),
  /** WhatsApp remote JID, e.g. 79991234567@s.whatsapp.net. */
  waChatId: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  lastPreview: z.string().nullable(),
  unreadCount: z.number().int().nonnegative(),
});
export type ChatDto = z.infer<typeof chatDtoSchema>;

/** Media metadata (the file itself lives in object storage, never in the DB). */
export const mediaDtoSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  fileName: z.string().nullable(),
  size: z.number().int().nonnegative().nullable(),
  /** Download URL via the backend proxy (auth required). */
  url: z.string(),
});
export type MediaDto = z.infer<typeof mediaDtoSchema>;

/** A message inside a conversation. */
export const messageDtoSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  numberId: z.string(),
  direction: messageDirectionSchema,
  type: messageTypeSchema,
  /** Message text or media caption. Treated as data, never as instructions. */
  text: z.string().nullable(),
  media: mediaDtoSchema.nullable(),
  fromMe: z.boolean(),
  author: z.string().nullable(),
  status: messageStatusSchema,
  timestamp: z.string(),
});
export type MessageDto = z.infer<typeof messageDtoSchema>;

/** Login request. */
export const loginDtoSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginDtoSchema>;

/** Login response. */
export const authResultDtoSchema = z.object({
  token: z.string(),
  user: userDtoSchema,
});
export type AuthResultDto = z.infer<typeof authResultDtoSchema>;

/** Outbound: operator reply (text-only in MVP). */
export const sendMessageDtoSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1).max(4096),
});
export type SendMessageDto = z.infer<typeof sendMessageDtoSchema>;

/** Admin: create a new panel user. */
export const createUserDtoSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
  role: userRoleSchema,
});
export type CreateUserDto = z.infer<typeof createUserDtoSchema>;

/** Admin: create / link a new WhatsApp number. */
export const createNumberDtoSchema = z.object({
  name: z.string().min(1).max(64),
});
export type CreateNumberDto = z.infer<typeof createNumberDtoSchema>;

/** Admin: assign a set of numbers to an operator. */
export const assignNumbersDtoSchema = z.object({
  numberIds: z.array(z.string()),
});
export type AssignNumbersDto = z.infer<typeof assignNumbersDtoSchema>;

/** QR payload for the linking screen. */
export const qrDtoSchema = z.object({
  numberId: z.string(),
  /** data:image/png;base64,... or null if not ready yet. */
  qr: z.string().nullable(),
  status: sessionStatusSchema,
});
export type QrDto = z.infer<typeof qrDtoSchema>;
