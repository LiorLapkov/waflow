import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SessionStatus } from '@waflow/shared';
import type { AppEnv } from '../config/env';

/** Session info: normalized status and the linked phone number. */
export interface WaSessionInfo {
  status: SessionStatus;
  phone: string | null;
}

/** Start-instance result — may include the QR right away. */
export interface InstanceStart {
  qr: string | null;
  status: SessionStatus;
}

/**
 * Evolution API client (Baileys, multi-instance).
 *
 * Every number is an independent Evolution instance with its own
 * QR, session, and webhook (which is actually global — see compose).
 * Request auth: `apikey` header = EVOLUTION_API_KEY.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly http: AxiosInstance;
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;
  /**
   * Per-instance cache of the last QR. Evolution returns a QR on create or
   * via the QRCODE_UPDATED webhook — but the same endpoint does not return it again.
   * We cache it so the polling UI can always fetch a fresh QR.
   */
  private readonly qrCache = new Map<string, string>();

  constructor(config: ConfigService<AppEnv, true>) {
    this.http = axios.create({
      baseURL: config.get('EVOLUTION_BASE_URL', { infer: true }),
      headers: { apikey: config.get('EVOLUTION_API_KEY', { infer: true }) },
      timeout: 30_000,
    });
    this.webhookUrl = `${config.get('BACKEND_PUBLIC_URL', { infer: true })}/webhooks/waha`;
    this.webhookSecret = config.get('EVOLUTION_WEBHOOK_SECRET', { infer: true });
  }

  /** Cache the QR — called from WebhookService on QRCODE_UPDATED. */
  cacheQr(instance: string, qrDataUri: string): void {
    this.qrCache.set(instance, qrDataUri);
  }

  /** Drop the cached QR (e.g. after a successful connect). */
  clearQr(instance: string): void {
    this.qrCache.delete(instance);
  }

  /**
   * Normalize a Baileys connection state into our SessionStatus.
   * Evolution emits: `open` (working), `connecting`, `close`, `qr`, or no instance.
   */
  static normalizeStatus(raw: string | undefined): SessionStatus {
    switch ((raw ?? '').toLowerCase()) {
      case 'open':
        return SessionStatus.Working;
      case 'connecting':
        return SessionStatus.Starting;
      case 'close':
        return SessionStatus.Stopped;
      case 'qr':
      case 'pairing':
        return SessionStatus.ScanQr;
      default:
        return SessionStatus.Stopped;
    }
  }

  /** Per-instance webhook config. */
  private webhookConfig() {
    return {
      enabled: true,
      url: this.webhookUrl,
      webhookByEvents: false,
      webhookBase64: true,
      headers: { apikey: this.webhookSecret },
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
    };
  }

  /** Create a new instance with a per-instance webhook — Evolution returns the QR in the response. */
  async createInstance(name: string): Promise<InstanceStart> {
    try {
      const { data } = await this.http.post('/instance/create', {
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: this.webhookConfig(),
      });
      const qr = this.extractQr(data);
      if (qr) this.cacheQr(name, qr);
      const status = WhatsappService.normalizeStatus(data?.instance?.status ?? 'connecting');
      return { qr, status };
    } catch (err) {
      // 403/409 = instance already exists. Refresh the webhook and reconnect.
      if (axios.isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 409)) {
        await this.setWebhook(name).catch(() => undefined);
        return this.connectInstance(name);
      }
      this.logger.error(`createInstance(${name}) failed`, err as Error);
      throw err;
    }
  }

  /** Set the webhook on an already-existing instance. */
  async setWebhook(name: string): Promise<void> {
    await this.http
      .post(`/webhook/set/${name}`, { webhook: this.webhookConfig() })
      .catch((err: unknown) => {
        this.logger.warn(`setWebhook(${name}): ${(err as Error).message}`);
      });
  }

  /** Reconnect an existing instance (e.g. to get a fresh QR). */
  async connectInstance(name: string): Promise<InstanceStart> {
    try {
      const { data } = await this.http.get(`/instance/connect/${name}`);
      const qr = this.extractQr(data);
      return { qr, status: qr ? SessionStatus.ScanQr : SessionStatus.Starting };
    } catch (err) {
      this.logger.warn(`connectInstance(${name}): ${(err as Error).message}`);
      return { qr: null, status: SessionStatus.Stopped };
    }
  }

  /** Current connection status + linked phone number. */
  async getSessionInfo(name: string): Promise<WaSessionInfo> {
    try {
      const { data } = await this.http.get(`/instance/connectionState/${name}`);
      const state = data?.instance?.state ?? data?.state;
      // Pull the phone from fetchInstances (owner.id field).
      let phone: string | null = null;
      try {
        const list = await this.http.get('/instance/fetchInstances', { params: { instanceName: name } });
        const arr = Array.isArray(list.data) ? list.data : [];
        const me = arr[0]?.ownerJid ?? arr[0]?.instance?.owner ?? null;
        if (typeof me === 'string') {
          phone = me.replace(/@.*$/, '');
        }
      } catch {
        /* ignore — phone stays null */
      }
      return { status: WhatsappService.normalizeStatus(state), phone };
    } catch {
      return { status: SessionStatus.Stopped, phone: null };
    }
  }

  /**
   * Fresh QR — try the cache first (populated either on create or by the
   * QRCODE_UPDATED webhook), then hit /connect (often empty after the first call).
   */
  async getQr(name: string): Promise<string | null> {
    const cached = this.qrCache.get(name);
    if (cached) return cached;
    const { qr } = await this.connectInstance(name);
    if (qr) this.cacheQr(name, qr);
    return qr;
  }

  /** Logout without deleting the instance. */
  async logoutInstance(name: string): Promise<void> {
    await this.http.delete(`/instance/logout/${name}`).catch(() => undefined);
  }

  /** Full instance removal (logout + delete state). */
  async deleteInstance(name: string): Promise<void> {
    await this.logoutInstance(name);
    await this.http.delete(`/instance/delete/${name}`).catch(() => undefined);
  }

  /**
   * Send a text message. `chatId` is our `<digits>@c.us` / `@g.us` form.
   * Evolution accepts either a full JID or a bare number (for @c.us).
   * Returns the WhatsApp message id.
   */
  async sendText(instance: string, chatId: string, text: string): Promise<string | null> {
    const number = chatId.includes('@') ? chatId : `${chatId}`;
    const { data } = await this.http.post(`/message/sendText/${instance}`, {
      number,
      text,
    });
    const id = data?.key?.id ?? data?.messageId ?? null;
    return typeof id === 'string' ? id : null;
  }

  /**
   * Fetch message media as base64. Used when the webhook delivered the
   * message without inline base64 (by default we ask for it explicitly).
   */
  async fetchMediaBase64(
    instance: string,
    messageKey: { id: string; remoteJid: string; fromMe?: boolean },
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const { data } = await this.http.post(`/chat/getBase64FromMediaMessage/${instance}`, {
        message: { key: messageKey },
        convertToMp4: false,
      });
      const base64 = data?.base64 ?? data?.media;
      const mime = data?.mimetype ?? data?.mediaType ?? 'application/octet-stream';
      if (!base64) return null;
      return { buffer: Buffer.from(base64, 'base64'), mimeType: mime };
    } catch (err) {
      this.logger.warn(`fetchMediaBase64(${messageKey.id}): ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Look up a chat by JID. Baileys typically exposes the contact name in
   * `pushName` on a message; the real phone number can be pulled from
   * `/chat/findContacts/{instance}` or via `/chat/findChats`.
   */
  async findChatInfo(
    instance: string,
    chatId: string,
  ): Promise<{ name: string | null } | null> {
    try {
      const { data } = await this.http.post(`/chat/findContacts/${instance}`, {
        where: { id: chatId },
      });
      if (Array.isArray(data) && data.length > 0) {
        const c = data[0];
        return { name: typeof c?.pushName === 'string' ? c.pushName : null };
      }
      return null;
    } catch (err) {
      this.logger.warn(`findChatInfo(${chatId}): ${(err as Error).message}`);
      return null;
    }
  }

  private extractQr(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const root = data as Record<string, unknown>;
    const qr = (root.qrcode as Record<string, unknown> | undefined) ?? (root.qr as Record<string, unknown> | undefined);
    if (!qr) return null;
    // Evolution returns either a bare base64 string or a data: URI.
    const candidate =
      (qr.base64 as string | undefined) ??
      (qr.code as string | undefined) ??
      (qr.image as string | undefined) ??
      null;
    if (!candidate) return null;
    return candidate.startsWith('data:') ? candidate : `data:image/png;base64,${candidate}`;
  }
}
