import type { ChatDto } from '@waflow/shared';

/**
 * Title for the chat row / header.
 * Priority: explicit name (pushName from WA) → phone → "Unknown contact" hint.
 * Never show raw waChatId ("…@lid"/"…@g.us") and never prefix "+" to a LID.
 */
export function chatTitle(chat: ChatDto): string {
  if (chat.name && chat.name.trim()) return chat.name.trim();
  if (chat.phone) return `+${chat.phone}`;
  if (chat.waChatId.endsWith('@g.us')) return 'Group';
  // @lid and other unidentified domains
  return 'Unknown contact';
}

/** Subtitle below the name. Doesn't repeat whatever is already in the title. */
export function chatSubtitle(chat: ChatDto): string | null {
  if (chat.name && chat.phone) return `+${chat.phone}`;
  return null;
}

/** First letter for the avatar placeholder. */
export function chatAvatarLetter(chat: ChatDto): string {
  const src = chat.name || chat.phone || '?';
  return src.slice(0, 1).toUpperCase();
}
