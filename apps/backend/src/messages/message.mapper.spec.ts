import { MessageType } from '@waflow/shared';
import { detectMessageType, extractMediaMeta, extractText } from './message.mapper';

describe('detectMessageType', () => {
  it('detects Baileys message types', () => {
    expect(detectMessageType({ conversation: 'hi' })).toBe(MessageType.Text);
    expect(detectMessageType({ extendedTextMessage: { text: 'hi' } })).toBe(MessageType.Text);
    expect(detectMessageType({ imageMessage: {} })).toBe(MessageType.Image);
    expect(detectMessageType({ videoMessage: {} })).toBe(MessageType.Video);
    expect(detectMessageType({ audioMessage: {} })).toBe(MessageType.Voice);
    expect(detectMessageType({ documentMessage: {} })).toBe(MessageType.Document);
    expect(detectMessageType({ stickerMessage: {} })).toBe(MessageType.Image);
    expect(detectMessageType(null)).toBe(MessageType.Text);
    expect(detectMessageType(undefined)).toBe(MessageType.Text);
  });
});

describe('extractText', () => {
  it('extracts text from various fields', () => {
    expect(extractText({ conversation: 'hello' })).toBe('hello');
    expect(extractText({ extendedTextMessage: { text: 'long' } })).toBe('long');
    expect(extractText({ imageMessage: { caption: 'caption' } })).toBe('caption');
    expect(extractText({ videoMessage: { caption: 'v' } })).toBe('v');
    expect(extractText({ documentMessage: { caption: 'd' } })).toBe('d');
    expect(extractText({ stickerMessage: {} })).toBeNull();
    expect(extractText(null)).toBeNull();
  });
});

describe('extractMediaMeta', () => {
  it('returns mime and fileName', () => {
    expect(extractMediaMeta({ imageMessage: { mimetype: 'image/png' } })).toEqual({
      mimeType: 'image/png',
      fileName: null,
    });
    expect(
      extractMediaMeta({ documentMessage: { fileName: 'cv.pdf', mimetype: 'application/pdf' } }),
    ).toEqual({ mimeType: 'application/pdf', fileName: 'cv.pdf' });
    expect(extractMediaMeta({ conversation: 'no media' })).toBeNull();
    expect(extractMediaMeta(null)).toBeNull();
  });
});
