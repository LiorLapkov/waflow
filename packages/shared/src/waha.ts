import { z } from 'zod';

/**
 * Minimal types for Evolution API (Baileys) webhook events.
 * The full Evolution schema is larger — we only keep the fields we use.
 * Message content is always treated as DATA, never as instructions
 * (see rule 6 in CLAUDE.md).
 *
 * The filename `waha.ts` is historical (the project used the WAHA provider
 * earlier). The types themselves are aligned with Evolution v2. Evolution
 * also delivers the same event in two namings depending on configuration —
 * dot.case (`messages.upsert`) and SCREAMING_SNAKE (`MESSAGES_UPSERT`) — so
 * `normalizeWahaEvent` collapses them to one form.
 */

/** Event names we subscribe to. */
export const WahaEvent = {
  MessagesUpsert: 'messages.upsert',
  ConnectionUpdate: 'connection.update',
  QrcodeUpdated: 'qrcode.updated',
} as const;
export type WahaEventName = (typeof WahaEvent)[keyof typeof WahaEvent];

/** Normalize an event string to dot.case. `MESSAGES_UPSERT` → `messages.upsert`. */
export function normalizeWahaEvent(raw: string | undefined): string {
  if (!raw) return '';
  return raw.toLowerCase().replace(/_/g, '.');
}

/** Baileys message key (inside `data.key`). */
export const wahaKeySchema = z.object({
  id: z.string(),
  remoteJid: z.string(),
  fromMe: z.boolean().optional(),
  participant: z.string().optional(),
});
export type WahaKey = z.infer<typeof wahaKeySchema>;

/**
 * Baileys message content. Exactly one of the keys is present:
 * conversation for text, imageMessage/audioMessage/... for media.
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

/** `messages.upsert` payload (one new message). */
export const wahaMessagePayloadSchema = z.object({
  key: wahaKeySchema,
  pushName: z.string().nullish(),
  messageTimestamp: z.union([z.number(), z.string()]).optional(),
  message: wahaMessageContentSchema.nullish(),
  /** Inline base64 of media (when enabled on the instance webhook). */
  base64: z.string().nullish(),
  /** Evolution's own classification of the message type (optional). */
  messageType: z.string().nullish(),
});
export type WahaMessagePayload = z.infer<typeof wahaMessagePayloadSchema>;

/** `connection.update` payload. */
export const wahaSessionStatusPayloadSchema = z
  .object({
    /** open | connecting | close — connection state. */
    state: z.string().optional(),
    /** Alternative field, occasionally used instead of `state`. */
    status: z.string().optional(),
    /** The account JID, e.g. "972534247634@s.whatsapp.net". */
    wuid: z.string().optional(),
  })
  .passthrough();
export type WahaSessionStatusPayload = z.infer<typeof wahaSessionStatusPayloadSchema>;

/** `qrcode.updated` payload — Evolution sends a fresh QR. */
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

/** Envelope of any webhook event from Evolution. */
export const wahaWebhookSchema = z
  .object({
    event: z.string(),
    /** Instance name. */
    instance: z.string(),
    /** Payload shape depends on the event. */
    data: z.unknown(),
    /**
     * Evolution puts its `apikey` here (instance-level or the global one,
     * depending on configuration). The backend uses it to authenticate
     * webhook calls.
     */
    apikey: z.string().optional(),
  })
  .passthrough();
export type WahaWebhook = z.infer<typeof wahaWebhookSchema>;
