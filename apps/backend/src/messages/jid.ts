/**
 * Парсинг WhatsApp JID (chatId). WhatsApp/Baileys использует несколько форм:
 *  - "79991234567@s.whatsapp.net" — индивидуальный чат, Baileys (Evolution API);
 *  - "79991234567@c.us"           — старая форма (WAHA / whatsapp-web.js);
 *  - "83082031964409@lid"         — LID (Linked Device ID), псевдоним для приватности
 *                                    (когда контакт не сохранён). Это НЕ номер телефона;
 *  - "120363xxxxxxxxxxxx@g.us"    — групповой чат, локальная часть — id группы.
 *
 * Поле `phone` в БД должно содержать ТОЛЬКО реальный номер. Иначе UI добавит к нему `+`
 * и покажет несуществующий «номер» из 14–15 цифр LID.
 */
export interface ParsedJid {
  /** Локальная часть до `@` (телефон / LID / id группы). */
  local: string;
  /** Доменная часть после `@`: `c.us`, `lid`, `g.us`, ... */
  domain: string;
  /** Реальный номер телефона (без `+`, цифры) — только для `@c.us`. Иначе null. */
  phone: string | null;
  /** Это LID-псевдоним (не настоящий номер). */
  isLid: boolean;
  /** Это групповой чат. */
  isGroup: boolean;
}

export function parseJid(jid: string): ParsedJid {
  const [local, domain = ''] = jid.split('@');
  const isLid = domain === 'lid';
  const isGroup = domain === 'g.us';
  const isPersonal = domain === 'c.us' || domain === 's.whatsapp.net';
  const phone = isPersonal && /^\d+$/.test(local ?? '') ? local : null;
  return { local: local ?? '', domain, phone, isLid, isGroup };
}

/**
 * Извлечь номер из строки `name` WAHA-чата.
 * WAHA для LID-чатов часто кладёт сюда форматированный номер: "+972 53-424-7634".
 * Возвращаем { phone (только цифры), display (исходная строка) } если похоже на номер,
 * иначе name трактуется как имя контакта.
 */
export function extractPhoneFromName(
  name: string | null | undefined,
): { phone: string | null; display: string | null } {
  if (!name) return { phone: null, display: null };
  const trimmed = name.trim();
  // Эвристика: начинается с "+" и содержит ≥ 7 цифр → это номер
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 18) {
      return { phone: digits, display: trimmed };
    }
  }
  return { phone: null, display: trimmed };
}
