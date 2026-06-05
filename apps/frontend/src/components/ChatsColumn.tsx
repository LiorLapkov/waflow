'use client';

import type { ChatDto } from '@dljobs/shared';
import { formatTime } from '@/lib/format';
import { chatAvatarLetter, chatTitle } from '@/lib/chat-display';

interface Props {
  chats: ChatDto[];
  selectedChatId: string | null;
  hasNumber: boolean;
  onSelect: (id: string) => void;
  onBack?: () => void;
  visibilityClass?: string;
}

export function ChatsColumn({
  chats,
  selectedChatId,
  hasNumber,
  onSelect,
  onBack,
  visibilityClass = 'flex',
}: Props) {
  if (!hasNumber) {
    return (
      <div
        className={`${visibilityClass} h-full w-full items-center justify-center border-black/30 bg-wa-sidebar text-sm text-gray-500 md:w-80 md:border-r`}
      >
        Выберите номер
      </div>
    );
  }

  return (
    <div
      className={`${visibilityClass} h-full w-full flex-col border-black/30 bg-wa-sidebar md:w-80 md:border-r`}
    >
      <header className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-300">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded p-1 text-gray-400 hover:bg-wa-hover hover:text-gray-100 md:hidden"
            aria-label="Назад"
          >
            ←
          </button>
        )}
        Чаты
      </header>
      <div className="flex-1 overflow-y-auto">
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center gap-3 border-b border-black/20 px-4 py-3 text-left hover:bg-wa-hover ${
              selectedChatId === c.id ? 'bg-wa-hover' : ''
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wa-panel text-gray-300">
              {chatAvatarLetter(c)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-gray-100">{chatTitle(c)}</span>
                <span className="shrink-0 text-[11px] text-gray-500">{formatTime(c.lastMessageAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-gray-400">{c.lastPreview ?? ''}</span>
                {c.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-wa-green px-1.5 text-[11px] font-medium text-black">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
        {chats.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Пока нет входящих сообщений</p>
        )}
      </div>
    </div>
  );
}
