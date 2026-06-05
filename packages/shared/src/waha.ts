import { z } from 'zod';

/**
 * Минимальные типы webhook-событий **Evolution API** (Baileys), нужные системе.
 * Полная схема Evolution шире — берём только используемые поля, остальное игнорируем.
 * Контент сообщений трактуется строго как ДАННЫЕ (правило 6 из CLAUDE.md).
 *
 * Файл называется waha.ts по историческим причинам (раньше использовался WAHA);
 * сами типы переименованы под Evolution. Поле события — формат `MESSAGES_UPSERT`,
 * `CONNECTION_UPDATE`, `QRCODE_UPDATED` (Evolution также присылает kebab-case
 * вариант: `messages.upsert` — учитываем оба).
 */

/** Имена событий Evolution, на которые подписываемся. */
export const WahaEvent = {
  MessagesUpsert: 'messages.upsert',
  ConnectionUpdate: 'connection.update',
  QrcodeUpdated: 'qrcode.updated',
} as const;
export type WahaEventName = (typeof WahaEvent)[keyof typeof WahaEvent];

/** Нормализует строку события Evolution в kebab.case. `MESSAGES_UPSERT` → `messages.upsert`. */
export function normalizeWahaEvent(raw: string | undefined): string {
  if (!raw) return '';
  return raw.toLowerCase().replace(/_/g, '.');
}

/** Ключ сообщения Baileys (внутри `data.key`). */
export const wahaKeySchema = z.object({
  id: z.string(),
  remoteJid: z.string(),
  fromMe: z.boolean().optional(),
  participant: z.string().optional(),
});
export type WahaKey = z.infer<typeof wahaKeySchema>;

/**
 * Контент сообщения Baileys. Один из ключей будет присутствовать
 * (conversation для текста, imageMessage/audioMessage/... для медиа).
 */
export const wahaMessageContentSchema = z
  .object({
    conversation: z.string().optional(),
    extendedTextMessage: z.object({ text: z.string().optional() }).passthrough().optional(),
    imageMessage: z.object({ caption: z.string().optional(), mimetype: z.string().optional() }).passthrough().optional(),
    videoMessage: z.object({ caption: z.string().optional(), mimetype: z.string().optional() }).passthrough().optional(),
    audioMessage: z
      .object({ mimetype: z.string().optional(), ptt: z.boolean().optional() })
      .passthrough()
      .optional(),
    documentMessage: z
      .object({ fileName: z.string().optional(), mimetype: z.string().optional(), caption: z.string().optional() })
      .passthrough()
      .optional(),
    stickerMessage: z.object({ mimetype: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();
export type WahaMessageContent = z.infer<typeof wahaMessageContentSchema>;

/** Payload события `messages.upsert` (data-блок одного нового сообщения). */
export const wahaMessagePayloadSchema = z.object({
  key: wahaKeySchema,
  pushName: z.string().nullish(),
  messageTimestamp: z.union([z.number(), z.string()]).optional(),
  message: wahaMessageContentSchema.nullish(),
  /** Base64 медиа (когда включено в настройках инстанса). */
  base64: z.string().nullish(),
  /** Тип сообщения по Evolution-классификации (необязательно). */
  messageType: z.string().nullish(),
});
export type WahaMessagePayload = z.infer<typeof wahaMessagePayloadSchema>;

/** Payload события `connection.update`. */
export const wahaSessionStatusPayloadSchema = z
  .object({
    /** open | connecting | close — состояние соединения. */
    state: z.string().optional(),
    /** Альтернативное поле, иногда отдают так. */
    status: z.string().optional(),
    /** JID самого аккаунта, например "972534247634@s.whatsapp.net". */
    wuid: z.string().optional(),
  })
  .passthrough();
export type WahaSessionStatusPayload = z.infer<typeof wahaSessionStatusPayloadSchema>;

/** Payload события `qrcode.updated` — Evolution присылает свежий QR. */
export const wahaQrPayloadSchema = z
  .object({
    qrcode: z
      .object({
        base64: z.string().optional(),
        code: z.string().optional(),
      })
      .passthrough()
      .optional(),
    base64: z.string().optional(),
    code: z.string().optional(),
  })
  .passthrough();
export type WahaQrPayload = z.infer<typeof wahaQrPayloadSchema>;

/** Обёртка любого webhook-события Evolution. */
export const wahaWebhookSchema = z
  .object({
    event: z.string(),
    /** Имя инстанса. */
    instance: z.string(),
    /** Полезная нагрузка — формат зависит от события. */
    data: z.unknown(),
    /**
     * Evolution кладёт сюда свой `apikey` (= EVOLUTION_API_KEY).
     * Используется бэкендом для аутентификации webhook-вызова.
     */
    apikey: z.string().optional(),
  })
  .passthrough();
export type WahaWebhook = z.infer<typeof wahaWebhookSchema>;
