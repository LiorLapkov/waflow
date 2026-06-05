import {
  MessageType,
  type MediaDto,
  type MessageDto,
  type WahaMessageContent,
  type WahaMessagePayload,
} from '@waflow/shared';
import type { Media, Message } from '@prisma/client';

/** Detect the message type by Baileys content (`message.imageMessage` etc). */
export function detectMessageType(content: WahaMessageContent | null | undefined): MessageType {
  if (!content) return MessageType.Text;
  if (content.imageMessage) return MessageType.Image;
  if (content.videoMessage) return MessageType.Video;
  if (content.audioMessage) return MessageType.Voice;
  if (content.documentMessage) return MessageType.Document;
  if (content.stickerMessage) return MessageType.Image;
  return MessageType.Text;
}

/** Text or media caption from a Baileys payload. */
export function extractText(content: WahaMessageContent | null | undefined): string | null {
  if (!content) return null;
  if (typeof content.conversation === 'string' && content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;
  if (content.imageMessage?.caption) return content.imageMessage.caption;
  if (content.videoMessage?.caption) return content.videoMessage.caption;
  if (content.documentMessage?.caption) return content.documentMessage.caption;
  return null;
}

/** Media metadata (mime, filename) from a Baileys payload. */
export function extractMediaMeta(
  content: WahaMessageContent | null | undefined,
): { mimeType: string; fileName: string | null } | null {
  if (!content) return null;
  if (content.imageMessage) {
    return { mimeType: content.imageMessage.mimetype ?? 'image/jpeg', fileName: null };
  }
  if (content.videoMessage) {
    return { mimeType: content.videoMessage.mimetype ?? 'video/mp4', fileName: null };
  }
  if (content.audioMessage) {
    return { mimeType: content.audioMessage.mimetype ?? 'audio/ogg', fileName: null };
  }
  if (content.documentMessage) {
    return {
      mimeType: content.documentMessage.mimetype ?? 'application/octet-stream',
      fileName: content.documentMessage.fileName ?? null,
    };
  }
  if (content.stickerMessage) {
    return { mimeType: content.stickerMessage.mimetype ?? 'image/webp', fileName: null };
  }
  return null;
}

/** A unified view of one inbound Baileys message for our pipeline. */
export interface ParsedInbound {
  waMessageId: string;
  waChatId: string;
  fromMe: boolean;
  pushName: string | null;
  timestamp: Date;
  type: MessageType;
  text: string | null;
  mediaMeta: { mimeType: string; fileName: string | null } | null;
  base64: string | null;
}

export function parseInbound(p: WahaMessagePayload): ParsedInbound {
  const ts =
    typeof p.messageTimestamp === 'string'
      ? Number(p.messageTimestamp)
      : (p.messageTimestamp ?? Math.floor(Date.now() / 1000));
  const content = p.message ?? null;
  return {
    waMessageId: p.key.id,
    waChatId: p.key.remoteJid,
    fromMe: p.key.fromMe ?? false,
    pushName: p.pushName ?? null,
    timestamp: new Date(ts * 1000),
    type: detectMessageType(content),
    text: extractText(content),
    mediaMeta: extractMediaMeta(content),
    base64: p.base64 ?? null,
  };
}

export function toMediaDto(media: Media): MediaDto {
  return {
    id: media.id,
    mimeType: media.mimeType,
    fileName: media.fileName,
    size: media.size,
    url: `/media/${media.id}`,
  };
}

export function toMessageDto(message: Message & { media: Media | null }): MessageDto {
  return {
    id: message.id,
    chatId: message.chatId,
    numberId: message.numberId,
    direction: message.direction,
    type: message.type,
    text: message.text,
    media: message.media ? toMediaDto(message.media) : null,
    fromMe: message.fromMe,
    author: message.author,
    status: message.status,
    timestamp: message.timestamp.toISOString(),
  };
}
