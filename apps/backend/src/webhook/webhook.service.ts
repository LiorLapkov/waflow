import { Injectable, Logger } from '@nestjs/common';
import {
  SessionStatus,
  WahaEvent,
  normalizeWahaEvent,
  wahaMessagePayloadSchema,
  wahaQrPayloadSchema,
  wahaSessionStatusPayloadSchema,
  type WahaWebhook,
} from '@waflow/shared';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { NumbersService } from '../numbers/numbers.service';
import { MessagesService } from '../messages/messages.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly numbers: NumbersService,
    private readonly messages: MessagesService,
    private readonly realtime: RealtimeGateway,
    private readonly whatsapp: WhatsappService,
  ) {}

  /**
   * Route an Evolution (Baileys) webhook event. Message content is strictly DATA.
   * Evolution delivers `data` shaped as:
   *   - messages.upsert → one message object (key/pushName/message/…)
   *     or an array with one element under `data.messages`.
   *   - connection.update → { state: 'open'|'connecting'|'close', wuid? }
   *   - qrcode.updated → QR payload (cached, the frontend polls for it).
   */
  async handle(body: WahaWebhook): Promise<void> {
    const event = normalizeWahaEvent(body.event);
    const number = await this.numbers.findByInstance(body.instance);
    if (!number) {
      this.logger.warn(`Webhook for an unknown instance: ${body.instance}`);
      return;
    }

    if (event === WahaEvent.MessagesUpsert) {
      // Evolution can send a single object or an array of messages.
      const rawList = this.extractMessages(body.data);
      for (const raw of rawList) {
        const parsed = wahaMessagePayloadSchema.safeParse(raw);
        if (!parsed.success) {
          this.logger.warn(`Malformed message payload for ${body.instance}`);
          continue;
        }
        await this.messages.ingestInbound(number, parsed.data);
      }
      return;
    }

    if (event === WahaEvent.ConnectionUpdate) {
      const parsed = wahaSessionStatusPayloadSchema.safeParse(body.data);
      if (!parsed.success) {
        return;
      }
      const stateRaw = parsed.data.state ?? parsed.data.status;
      const status = WhatsappService.normalizeStatus(stateRaw);
      // wuid like "972534247634@s.whatsapp.net" — extract the phone number.
      const phone = parsed.data.wuid ? parsed.data.wuid.replace(/@.*$/, '') : undefined;
      const updated = await this.numbers.syncStatus(number.id, status, phone);
      this.realtime.emitSessionStatus({
        numberId: number.id,
        status,
        phone: updated.phone,
      });
      // Connected — drop the cached QR.
      if (status === SessionStatus.Working) {
        this.whatsapp.clearQr(body.instance);
      }
      return;
    }

    if (event === WahaEvent.QrcodeUpdated) {
      const parsed = wahaQrPayloadSchema.safeParse(body.data);
      if (!parsed.success) return;
      const base64 = parsed.data.qrcode?.base64 ?? parsed.data.base64 ?? null;
      if (!base64) return;
      const qrDataUri = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      this.whatsapp.cacheQr(body.instance, qrDataUri);
      this.realtime.emitSessionQr({ numberId: number.id, qr: qrDataUri, status: SessionStatus.ScanQr });
    }
  }

  /** Pull an array of messages out of `data` regardless of shape (object or {messages:[...]}). */
  private extractMessages(data: unknown): unknown[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
      const obj = data as { messages?: unknown; key?: unknown };
      if (Array.isArray(obj.messages)) return obj.messages;
      if (obj.key) return [data];
    }
    return [];
  }
}
