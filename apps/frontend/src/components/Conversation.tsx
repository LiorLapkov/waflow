'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatDto, MessageDto } from '@dljobs/shared';
import { api } from '@/lib/api';
import { chatAvatarLetter, chatSubtitle, chatTitle } from '@/lib/chat-display';
import { MessageBubble } from './MessageBubble';

interface Props {
  chat: ChatDto | null;
  messages: MessageDto[];
  onSend: (text: string) => Promise<void>;
  onBack?: () => void;
  visibilityClass?: string;
}

export function Conversation({ chat, messages, onSend, onBack, visibilityClass = 'flex' }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const resolveNumber = async () => {
    if (!chat || resolving) return;
    setResolving(true);
    try {
      await api.post(`/chats/${chat.id}/resolve`);
      // обновлённый чат прилетит через Socket.io (chat:updated)
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chat) {
    return (
      <div
        className={`${visibilityClass} flex-1 items-center justify-center bg-wa-dark text-gray-500`}
      >
        Выберите чат, чтобы начать
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onSend(value);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${visibilityClass} flex-1 flex-col bg-wa-dark`}>
      <header className="flex items-center gap-3 border-b border-black/30 bg-wa-panel px-4 py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded p-1 text-gray-400 hover:bg-wa-hover hover:text-gray-100 md:hidden"
            aria-label="Назад"
          >
            ←
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wa-sidebar text-gray-300">
          {chatAvatarLetter(chat)}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-100">{chatTitle(chat)}</div>
          {chatSubtitle(chat) && <div className="text-xs text-gray-400">{chatSubtitle(chat)}</div>}
        </div>
        {!chat.phone && (
          <button
            onClick={resolveNumber}
            disabled={resolving}
            title="Запросить реальный номер у WAHA"
            className="rounded border border-wa-green/50 px-3 py-1 text-xs text-wa-green hover:bg-wa-green/10 disabled:opacity-50"
          >
            {resolving ? 'Уточняю…' : 'Уточнить номер'}
          </button>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-black/30 bg-wa-panel px-4 py-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите сообщение…"
          className="flex-1 rounded-full bg-wa-dark px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-wa-green"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-full bg-wa-green px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Отпр.
        </button>
      </form>
    </div>
  );
}
