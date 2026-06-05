import { SessionStatus } from '@waflow/shared';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService.normalizeStatus', () => {
  it('maps Baileys states to SessionStatus', () => {
    expect(WhatsappService.normalizeStatus('open')).toBe(SessionStatus.Working);
    expect(WhatsappService.normalizeStatus('connecting')).toBe(SessionStatus.Starting);
    expect(WhatsappService.normalizeStatus('close')).toBe(SessionStatus.Stopped);
    expect(WhatsappService.normalizeStatus('qr')).toBe(SessionStatus.ScanQr);
  });

  it('unknown / empty status -> stopped', () => {
    expect(WhatsappService.normalizeStatus(undefined)).toBe(SessionStatus.Stopped);
    expect(WhatsappService.normalizeStatus('SOMETHING')).toBe(SessionStatus.Stopped);
  });
});
