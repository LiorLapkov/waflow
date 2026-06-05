import type { ChatDto } from '@waflow/shared';
import type { Chat } from '@prisma/client';

export function toChatDto(chat: Chat): ChatDto {
  return {
    id: chat.id,
    numberId: chat.numberId,
    waChatId: chat.waChatId,
    name: chat.name,
    phone: chat.phone,
    lastMessageAt: chat.lastMessageAt ? chat.lastMessageAt.toISOString() : null,
    lastPreview: chat.lastPreview,
    unreadCount: chat.unreadCount,
  };
}
