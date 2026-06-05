/**
 * Parse a WhatsApp JID (chatId). WhatsApp/Baileys uses several forms:
 *  - "79991234567@s.whatsapp.net" — individual chat, Baileys (Evolution API);
 *  - "79991234567@c.us"           — legacy form (WAHA / whatsapp-web.js);
 *  - "83082031964409@lid"         — LID (Linked Device ID), a privacy alias
 *                                    (used when the contact is not saved). NOT a real phone number;
 *  - "120363xxxxxxxxxxxx@g.us"    — group chat, local part is the group id.
 *
 * `phone` in the DB must contain ONLY a real number. Otherwise the UI will
 * prefix "+" and display a non-existent 14–15-digit LID as a phone.
 */
export interface ParsedJid {
  /** Local part before `@` (phone / LID / group id). */
  local: string;
  /** Domain part after `@`: `c.us`, `lid`, `g.us`, … */
  domain: string;
  /** Real phone number (digits, no `+`) — only for `@c.us`. Null otherwise. */
  phone: string | null;
  /** This is a LID alias (not a real number). */
  isLid: boolean;
  /** This is a group chat. */
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
 * Extract a phone number from a chat `name` returned by the provider.
 * For LID chats the provider often puts a formatted number here, e.g. "+972 53-424-7634".
 * Return { phone (digits only), display (original string) } if it looks like a number,
 * otherwise the value is treated as a contact name.
 */
export function extractPhoneFromName(
  name: string | null | undefined,
): { phone: string | null; display: string | null } {
  if (!name) return { phone: null, display: null };
  const trimmed = name.trim();
  // Heuristic: starts with "+" and has at least 7 digits → looks like a number
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 18) {
      return { phone: digits, display: trimmed };
    }
  }
  return { phone: null, display: trimmed };
}
