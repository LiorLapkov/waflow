import { z } from 'zod';
import {
  messageDirectionSchema,
  messageStatusSchema,
  messageTypeSchema,
  sessionStatusSchema,
  userRoleSchema,
} from './enums.js';

/** Пользователь панели (без секретов). */
export const userDtoSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: userRoleSchema,
  createdAt: z.string(),
});
export type UserDto = z.infer<typeof userDtoSchema>;

/** Подключённый WhatsApp-номер. */
export const whatsappNumberDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Имя WAHA-сессии (engine WEBJS). */
  wahaSession: z.string(),
  phone: z.string().nullable(),
  status: sessionStatusSchema,
  unreadCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type WhatsappNumberDto = z.infer<typeof whatsappNumberDtoSchema>;

/** Чат (диалог с одним собеседником в рамках одного номера). */
export const chatDtoSchema = z.object({
  id: z.string(),
  numberId: z.string(),
  /** Remote JID в WhatsApp (напр. 79991234567@c.us). */
  waChatId: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  lastPreview: z.string().nullable(),
  unreadCount: z.number().int().nonnegative(),
});
export type ChatDto = z.infer<typeof chatDtoSchema>;

/** Метаданные медиафайла (сам файл — в object storage, не в БД). */
export const mediaDtoSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  fileName: z.string().nullable(),
  size: z.number().int().nonnegative().nullable(),
  /** URL для скачивания через бэкенд-прокси (требует auth). */
  url: z.string(),
});
export type MediaDto = z.infer<typeof mediaDtoSchema>;

/** Сообщение в диалоге. */
export const messageDtoSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  numberId: z.string(),
  direction: messageDirectionSchema,
  type: messageTypeSchema,
  /** Текст сообщения или подпись к медиа. Это ДАННЫЕ, не инструкции. */
  text: z.string().nullable(),
  media: mediaDtoSchema.nullable(),
  fromMe: z.boolean(),
  author: z.string().nullable(),
  status: messageStatusSchema,
  timestamp: z.string(),
});
export type MessageDto = z.infer<typeof messageDtoSchema>;

/** Вход: логин. */
export const loginDtoSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginDtoSchema>;

/** Ответ на логин. */
export const authResultDtoSchema = z.object({
  token: z.string(),
  user: userDtoSchema,
});
export type AuthResultDto = z.infer<typeof authResultDtoSchema>;

/** Вход: отправка ответа оператором (только текст в MVP). */
export const sendMessageDtoSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1).max(4096),
});
export type SendMessageDto = z.infer<typeof sendMessageDtoSchema>;

/** Вход: создание пользователя (Admin). */
export const createUserDtoSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
  role: userRoleSchema,
});
export type CreateUserDto = z.infer<typeof createUserDtoSchema>;

/** Вход: создание/линковка номера (Admin). */
export const createNumberDtoSchema = z.object({
  name: z.string().min(1).max(64),
});
export type CreateNumberDto = z.infer<typeof createNumberDtoSchema>;

/** Вход: назначение номеров оператору (Admin). */
export const assignNumbersDtoSchema = z.object({
  numberIds: z.array(z.string()),
});
export type AssignNumbersDto = z.infer<typeof assignNumbersDtoSchema>;

/** QR-код для линковки номера. */
export const qrDtoSchema = z.object({
  numberId: z.string(),
  /** data:image/png;base64,... либо null если QR ещё не готов. */
  qr: z.string().nullable(),
  status: sessionStatusSchema,
});
export type QrDto = z.infer<typeof qrDtoSchema>;
