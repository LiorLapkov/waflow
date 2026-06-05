import type { ChatDto } from '@dljobs/shared';

/**
 * Имя для шапки/строки чата.
 * Приоритет: явное имя (notifyName из WA) → телефон → пометка «Контакт без номера».
 * Никогда не показываем сырой waChatId («…@lid»/«…@g.us») и не префиксуем «+» к LID.
 */
export function chatTitle(chat: ChatDto): string {
  if (chat.name && chat.name.trim()) return chat.name.trim();
  if (chat.phone) return `+${chat.phone}`;
  if (chat.waChatId.endsWith('@g.us')) return 'Группа';
  // @lid и прочее без идентификации
  return 'Контакт без номера';
}

/** Подпись под именем (вторая строка). Не повторяет то, что уже в заголовке. */
export function chatSubtitle(chat: ChatDto): string | null {
  if (chat.name && chat.phone) return `+${chat.phone}`;
  return null;
}

/** Первая буква для аватарки. */
export function chatAvatarLetter(chat: ChatDto): string {
  const src = chat.name || chat.phone || '?';
  return src.slice(0, 1).toUpperCase();
}
