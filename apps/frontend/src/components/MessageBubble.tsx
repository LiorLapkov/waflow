'use client';

import { MessageType, type MessageDto } from '@dljobs/shared';
import { mediaUrl } from '@/lib/api';
import { formatTime } from '@/lib/format';

function MediaContent({ message }: { message: MessageDto }) {
  if (!message.media) return null;
  const src = mediaUrl(message.media.url);
  switch (message.type) {
    case MessageType.Image:
      return <img src={src} alt="" className="max-h-72 rounded" />;
    case MessageType.Video:
      return <video src={src} controls className="max-h-72 rounded" />;
    case MessageType.Voice:
      return <audio src={src} controls className="w-56" />;
    case MessageType.Document:
      return (
        <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
          📄 {message.media.fileName ?? 'Документ'}
        </a>
      );
    default:
      return null;
  }
}

export function MessageBubble({ message }: { message: MessageDto }) {
  const isOut = message.fromMe;
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
          isOut ? 'bg-wa-bubbleOut text-gray-50' : 'bg-wa-bubbleIn text-gray-100'
        }`}
      >
        {message.type !== MessageType.Text && (
          <div className="mb-1">
            <MediaContent message={message} />
          </div>
        )}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        <div className="mt-1 text-right text-[10px] text-gray-300/70">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
}
