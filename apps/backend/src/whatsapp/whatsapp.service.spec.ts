import { SessionStatus } from '@dljobs/shared';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService.normalizeStatus', () => {
  it('маппит состояния Baileys в SessionStatus', () => {
    expect(WhatsappService.normalizeStatus('open')).toBe(SessionStatus.Working);
    expect(WhatsappService.normalizeStatus('connecting')).toBe(SessionStatus.Starting);
    expect(WhatsappService.normalizeStatus('close')).toBe(SessionStatus.Stopped);
    expect(WhatsappService.normalizeStatus('qr')).toBe(SessionStatus.ScanQr);
  });

  it('неизвестный/пустой статус → stopped', () => {
    expect(WhatsappService.normalizeStatus(undefined)).toBe(SessionStatus.Stopped);
    expect(WhatsappService.normalizeStatus('SOMETHING')).toBe(SessionStatus.Stopped);
  });
});
