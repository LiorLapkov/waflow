import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SessionStatus } from '@dljobs/shared';
import type { AppEnv } from '../config/env';

/** Информация о сессии: статус (нормализованный) и привязанный телефон. */
export interface WaSessionInfo {
  status: SessionStatus;
  phone: string | null;
}

/** Результат старта инстанса — может вернуть QR сразу. */
export interface InstanceStart {
  qr: string | null;
  status: SessionStatus;
}

/**
 * Клиент Evolution API (Baileys, multi-instance).
 *
 * Все номера = независимые «instance» на стороне Evolution. У каждого свой
 * QR, своя сессия, свой webhook (на самом деле — глобальный, см. compose).
 * Защита запросов: заголовок `apikey` = EVOLUTION_API_KEY.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly http: AxiosInstance;
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;
  /**
   * Кэш последнего QR-кода per-instance. Evolution отдаёт QR при создании или
   * через webhook QRCODE_UPDATED — потом этим же endpoint не возвращает повторно.
   * Кэшируем, чтобы UI мог дёрнуть свежий QR через polling.
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

  /** Кладёт QR в кэш — вызывается из WebhookService при QRCODE_UPDATED. */
  cacheQr(instance: string, qrDataUri: string): void {
    this.qrCache.set(instance, qrDataUri);
  }

  /** Очищает QR (например, после успешного коннекта). */
  clearQr(instance: string): void {
    this.qrCache.delete(instance);
  }

  /**
   * Нормализация состояния соединения Baileys в наш SessionStatus.
   * Evolution: `open` (рабочее), `connecting`, `close`, `qr` или нет инстанса.
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

  /** Конфиг webhook'а, прописываемый per-instance. */
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

  /** Создать новый инстанс с per-instance webhook'ом — Evolution отдаст QR в payload. */
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
      // 403/409 = инстанс уже существует. Обновляем webhook и переподключаемся.
      if (axios.isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 409)) {
        await this.setWebhook(name).catch(() => undefined);
        return this.connectInstance(name);
      }
      this.logger.error(`createInstance(${name}) failed`, err as Error);
      throw err;
    }
  }

  /** Прописать webhook для уже существующего инстанса. */
  async setWebhook(name: string): Promise<void> {
    await this.http
      .post(`/webhook/set/${name}`, { webhook: this.webhookConfig() })
      .catch((err: unknown) => {
        this.logger.warn(`setWebhook(${name}): ${(err as Error).message}`);
      });
  }

  /** Перезапустить подключение существующего инстанса (например, для нового QR). */
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

  /** Текущий статус подключения + привязанный телефон. */
  async getSessionInfo(name: string): Promise<WaSessionInfo> {
    try {
      const { data } = await this.http.get(`/instance/connectionState/${name}`);
      const state = data?.instance?.state ?? data?.state;
      // Телефон вытащим из fetchInstances — там есть owner.id.
      let phone: string | null = null;
      try {
        const list = await this.http.get('/instance/fetchInstances', { params: { instanceName: name } });
        const arr = Array.isArray(list.data) ? list.data : [];
        const me = arr[0]?.ownerJid ?? arr[0]?.instance?.owner ?? null;
        if (typeof me === 'string') {
          phone = me.replace(/@.*$/, '');
        }
      } catch {
        /* игнорируем — phone остаётся null */
      }
      return { status: WhatsappService.normalizeStatus(state), phone };
    } catch {
      return { status: SessionStatus.Stopped, phone: null };
    }
  }

  /**
   * Свежий QR — сначала пробуем кэш (положили туда либо при создании, либо из
   * webhook QRCODE_UPDATED), затем дёргаем connect (часто пусто после первого раза).
   */
  async getQr(name: string): Promise<string | null> {
    const cached = this.qrCache.get(name);
    if (cached) return cached;
    const { qr } = await this.connectInstance(name);
    if (qr) this.cacheQr(name, qr);
    return qr;
  }

  /** Logout без удаления инстанса. */
  async logoutInstance(name: string): Promise<void> {
    await this.http.delete(`/instance/logout/${name}`).catch(() => undefined);
  }

  /** Полное удаление инстанса (выход + удаление состояния). */
  async deleteInstance(name: string): Promise<void> {
    await this.logoutInstance(name);
    await this.http.delete(`/instance/delete/${name}`).catch(() => undefined);
  }

  /**
   * Отправить текст. `chatId` — наш формат `<digits>@c.us` или `@g.us`.
   * Evolution принимает либо jid полностью, либо просто номер (для @c.us).
   * Возвращает ID сообщения от WhatsApp.
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
   * Скачать медиа сообщения через base64. Используется когда webhook прислал
   * сообщение без вложенного base64 (по умолчанию мы запрашиваем его явно).
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
   * Поиск чата по JID в списке чатов инстанса. У Baileys имя контакта обычно
   * лежит в `pushName` сообщения, а реальный номер можно получить из
   * `/chat/findContacts/{instance}` или из самих чатов через `/chat/findChats`.
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
    // Evolution отдаёт либо строку base64 (без префикса), либо data: URI.
    const candidate =
      (qr.base64 as string | undefined) ??
      (qr.code as string | undefined) ??
      (qr.image as string | undefined) ??
      null;
    if (!candidate) return null;
    return candidate.startsWith('data:') ? candidate : `data:image/png;base64,${candidate}`;
  }
}
