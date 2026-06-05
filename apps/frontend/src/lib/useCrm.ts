'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SocketEvent,
  type ChatDto,
  type ChatUpdatedPayload,
  type MessageDto,
  type MessageNewPayload,
  type SessionStatusPayload,
  type WhatsappNumberDto,
} from '@dljobs/shared';
import { api } from './api';
import { getSocket } from './socket';

/** Сортировка чатов по последней активности (свежие — сверху). */
function sortChats(chats: ChatDto[]): ChatDto[] {
  return [...chats].sort((a, b) => {
    const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return tb - ta;
  });
}

/** Мобильный «экран» — на телефоне видна одна колонка за раз. */
export type MobileView = 'numbers' | 'chats' | 'conversation';

export function useCrm() {
  const [numbers, setNumbers] = useState<WhatsappNumberDto[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatDto[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [mobileView, setMobileView] = useState<MobileView>('numbers');

  // Рефы для доступа к актуальному выбору внутри socket-обработчиков.
  const selectedNumberRef = useRef<string | null>(null);
  const selectedChatRef = useRef<string | null>(null);
  selectedNumberRef.current = selectedNumberId;
  selectedChatRef.current = selectedChatId;

  const loadNumbers = useCallback(async () => {
    const data = await api.get<WhatsappNumberDto[]>('/numbers');
    setNumbers(data);
  }, []);

  const selectNumber = useCallback(async (numberId: string) => {
    setSelectedNumberId(numberId);
    setSelectedChatId(null);
    setMessages([]);
    setMobileView('chats');
    const data = await api.get<ChatDto[]>(`/numbers/${numberId}/chats`);
    setChats(sortChats(data));
  }, []);

  const selectChat = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId);
    setMobileView('conversation');
    const data = await api.get<MessageDto[]>(`/chats/${chatId}/messages`);
    setMessages(data);
    await api.post(`/chats/${chatId}/read`).catch(() => undefined);
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  /** Мобильная навигация «Назад». */
  const goBack = useCallback(() => {
    setMobileView((v) => (v === 'conversation' ? 'chats' : 'numbers'));
  }, []);

  const sendText = useCallback(async (text: string) => {
    const chatId = selectedChatRef.current;
    if (!chatId) return;
    const msg = await api.post<MessageDto>('/messages', { chatId, text });
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  useEffect(() => {
    void loadNumbers();
  }, [loadNumbers]);

  // Подписка на realtime-события.
  useEffect(() => {
    const socket = getSocket();

    const onMessageNew = (p: MessageNewPayload) => {
      if (p.message.chatId === selectedChatRef.current) {
        setMessages((prev) => (prev.some((m) => m.id === p.message.id) ? prev : [...prev, p.message]));
        // Открытый чат — сразу помечаем прочитанным.
        if (!p.message.fromMe) {
          api.post(`/chats/${p.message.chatId}/read`).catch(() => undefined);
        }
      }
    };

    const onChatUpdated = (p: ChatUpdatedPayload) => {
      // Обновляем превью/непрочитанные в списке номеров.
      void loadNumbers();
      if (p.numberId !== selectedNumberRef.current) return;
      setChats((prev) => {
        const isOpen = p.chat.id === selectedChatRef.current;
        const next = prev.some((c) => c.id === p.chat.id)
          ? prev.map((c) => (c.id === p.chat.id ? { ...p.chat, unreadCount: isOpen ? 0 : p.chat.unreadCount } : c))
          : [p.chat, ...prev];
        return sortChats(next);
      });
    };

    const onSessionStatus = (p: SessionStatusPayload) => {
      setNumbers((prev) =>
        prev.map((n) => (n.id === p.numberId ? { ...n, status: p.status, phone: p.phone ?? n.phone } : n)),
      );
    };

    socket.on(SocketEvent.MessageNew, onMessageNew);
    socket.on(SocketEvent.ChatUpdated, onChatUpdated);
    socket.on(SocketEvent.SessionStatus, onSessionStatus);

    return () => {
      socket.off(SocketEvent.MessageNew, onMessageNew);
      socket.off(SocketEvent.ChatUpdated, onChatUpdated);
      socket.off(SocketEvent.SessionStatus, onSessionStatus);
    };
  }, [loadNumbers]);

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  return {
    numbers,
    selectedNumberId,
    chats,
    selectedChatId,
    selectedChat,
    messages,
    mobileView,
    loadNumbers,
    selectNumber,
    selectChat,
    sendText,
    goBack,
  };
}
