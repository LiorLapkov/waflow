import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MessageDirection,
  MessageStatus,
  MessageType,
  type ChatDto,
  type MessageDto,
  type SendMessageDto,
  type WahaMessagePayload,
} from '@dljobs/shared';
import type { WhatsappNumber } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { StorageService } from '../storage/storage.service';
import { NumbersService } from '../numbers/numbers.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { toChatDto } from '../chats/chat.mapper';
import { parseInbound, toMessageDto } from './message.mapper';
import { extractPhoneFromName, parseJid } from './jid';

const PREVIEW_LIMIT = 120;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly waha: WhatsappService,
    private readonly storage: StorageService,
    private readonly numbers: NumbersService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Превью для списка чатов. Контент трактуется только как данные. */
  private preview(type: MessageType, text: string | null): string {
    if (type !== MessageType.Text) {
      const labels: Record<string, string> = {
        image: '📷 Фото',
        video: '🎥 Видео',
        voice: '🎤 Голосовое',
        document: '📄 Документ',
      };
      return labels[type] ?? '[медиа]';
    }
    return (text ?? '').slice(0, PREVIEW_LIMIT);
  }

  private async upsertChat(numberId: string, waChatId: string, name: string | null | undefined) {
    // phone заполняем только для @c.us (реальный номер). Для @lid/@g.us — null.
    const { phone } = parseJid(waChatId);
    return this.prisma.chat.upsert({
      where: { numberId_waChatId: { numberId, waChatId } },
      create: { numberId, waChatId, phone, name: name ?? null },
      update: { ...(name ? { name } : {}), phone },
    });
  }

  /**
   * Best-effort резолв реального номера для LID-чата через Evolution-контакты.
   * Без номера запись кандидата в CRM бесполезна.
   */
  private async tryResolveLid(
    instance: string,
    numberId: string,
    chatId: string,
    waChatId: string,
  ): Promise<{ phone: string | null; name: string | null } | null> {
    const info = await this.waha.findChatInfo(instance, waChatId);
    if (!info) return null;
    const { phone, display } = extractPhoneFromName(info.name);
    if (!phone && !display) return null;
    const data: { phone?: string; name?: string } = {};
    if (phone) data.phone = phone;
    if (display) data.name = display;
    const updated = await this.prisma.chat.update({ where: { id: chatId }, data });
    this.realtime.emitChatUpdated({ numberId, chat: toChatDto(updated) });
    return { phone: updated.phone, name: updated.name };
  }

  /**
   * Обработка входящего сообщения из Evolution webhook (Baileys).
   * Идемпотентна по (numberId, waMessageId).
   * Медиа: используем base64 из payload (если включено), иначе запрашиваем явно.
   */
  async ingestInbound(number: WhatsappNumber, payload: WahaMessagePayload): Promise<void> {
    const m = parseInbound(payload);
    // Игнорируем собственные исходящие — мы их пишем сами в sendText.
    if (m.fromMe) return;

    const chat = await this.upsertChat(number.id, m.waChatId, m.pushName);

    let mediaId: string | null = null;
    if (m.mediaMeta) {
      try {
        let buffer: Buffer | null = null;
        let mime = m.mediaMeta.mimeType;

        if (m.base64) {
          buffer = Buffer.from(m.base64, 'base64');
        } else {
          // Дёрнем явный endpoint Evolution для скачивания.
          const dl = await this.waha.fetchMediaBase64(number.wahaSession, {
            id: m.waMessageId,
            remoteJid: m.waChatId,
            fromMe: m.fromMe,
          });
          if (dl) {
            buffer = dl.buffer;
            mime = dl.mimeType || mime;
          }
        }

        if (buffer) {
          const key = `${number.id}/${m.waMessageId}`;
          await this.storage.put(key, buffer, mime);
          const media = await this.prisma.media.create({
            data: {
              storageKey: key,
              mimeType: mime,
              fileName: m.mediaMeta.fileName,
              size: buffer.byteLength,
            },
          });
          mediaId = media.id;
        }
      } catch (err) {
        this.logger.warn(`Не удалось сохранить медиа ${m.waMessageId}: ${(err as Error).message}`);
      }
    }

    try {
      const message = await this.prisma.message.create({
        data: {
          chatId: chat.id,
          numberId: number.id,
          waMessageId: m.waMessageId,
          direction: MessageDirection.Inbound,
          type: m.type,
          text: m.text,
          mediaId,
          fromMe: false,
          author: m.pushName,
          status: MessageStatus.Delivered,
          timestamp: m.timestamp,
        },
        include: { media: true },
      });

      const updatedChat = await this.prisma.chat.update({
        where: { id: chat.id },
        data: {
          lastMessageAt: message.timestamp,
          lastPreview: this.preview(m.type, m.text),
          unreadCount: { increment: 1 },
        },
      });

      this.realtime.emitMessageNew({ numberId: number.id, message: toMessageDto(message) });
      this.realtime.emitChatUpdated({ numberId: number.id, chat: toChatDto(updatedChat) });

      // Для LID-чата без номера — фоновая попытка резолва.
      if (!updatedChat.phone && parseJid(m.waChatId).isLid) {
        void this.tryResolveLid(number.wahaSession, number.id, updatedChat.id, m.waChatId).catch(
          (e) => this.logger.warn(`tryResolveLid: ${(e as Error).message}`),
        );
      }
    } catch (err) {
      // Дубль ретрая webhook'а — уникальный индекс (numberId, waMessageId).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return;
      }
      throw err;
    }
  }

  /** Ответ оператора (только текст в MVP). Никаких рассылок — лишь ответ в чат. */
  async sendText(user: AuthUser, dto: SendMessageDto): Promise<MessageDto> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: dto.chatId },
      include: { number: true },
    });
    if (!chat) {
      throw new NotFoundException('Чат не найден');
    }
    await this.numbers.assertAccess(user, chat.numberId);

    const waMessageId = await this.waha.sendText(chat.number.wahaSession, chat.waChatId, dto.text);
    const message = await this.prisma.message.create({
      data: {
        chatId: chat.id,
        numberId: chat.numberId,
        waMessageId: waMessageId ?? `local_${randomUUID()}`,
        direction: MessageDirection.Outbound,
        type: MessageType.Text,
        text: dto.text,
        fromMe: true,
        author: user.username,
        status: MessageStatus.Sent,
        timestamp: new Date(),
      },
      include: { media: true },
    });

    const updatedChat = await this.prisma.chat.update({
      where: { id: chat.id },
      data: {
        lastMessageAt: message.timestamp,
        lastPreview: this.preview(MessageType.Text, dto.text),
      },
    });

    this.realtime.emitMessageNew({ numberId: chat.numberId, message: toMessageDto(message) });
    this.realtime.emitChatUpdated({ numberId: chat.numberId, chat: toChatDto(updatedChat) });
    return toMessageDto(message);
  }

  async listMessages(
    user: AuthUser,
    chatId: string,
    limit = 50,
    before?: string,
  ): Promise<MessageDto[]> {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException('Чат не найден');
    }
    await this.numbers.assertAccess(user, chat.numberId);

    const where: Prisma.MessageWhereInput = { chatId };
    if (before) {
      where.timestamp = { lt: new Date(before) };
    }
    const rows = await this.prisma.message.findMany({
      where,
      include: { media: true },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 100),
    });
    return rows.reverse().map(toMessageDto);
  }

  /** Принудительный резолв LID → реальный номер и имя (кнопка «Уточнить номер»). */
  async resolveChatInfo(user: AuthUser, chatId: string): Promise<ChatDto> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { number: true },
    });
    if (!chat) {
      throw new NotFoundException('Чат не найден');
    }
    await this.numbers.assertAccess(user, chat.numberId);
    await this.tryResolveLid(chat.number.wahaSession, chat.numberId, chat.id, chat.waChatId);
    const fresh = await this.prisma.chat.findUniqueOrThrow({ where: { id: chatId } });
    return toChatDto(fresh);
  }

  async markRead(user: AuthUser, chatId: string): Promise<void> {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException('Чат не найден');
    }
    await this.numbers.assertAccess(user, chat.numberId);
    const updated = await this.prisma.chat.update({
      where: { id: chatId },
      data: { unreadCount: 0 },
    });
    this.realtime.emitChatUpdated({ numberId: chat.numberId, chat: toChatDto(updated) });
  }
}
