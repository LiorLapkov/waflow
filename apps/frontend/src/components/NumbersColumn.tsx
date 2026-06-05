'use client';

import { useState, type FormEvent } from 'react';
import { UserRole, type WhatsappNumberDto } from '@dljobs/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { sessionStatusColor, sessionStatusLabel } from '@/lib/format';

interface Props {
  numbers: WhatsappNumberDto[];
  selectedNumberId: string | null;
  onSelect: (id: string) => void;
  onLink: (numberId: string) => void;
  onRefresh: () => void;
  /** Tailwind-класс видимости (на мобиле — отдельный экран). */
  visibilityClass?: string;
}

export function NumbersColumn({
  numbers,
  selectedNumberId,
  onSelect,
  onLink,
  onRefresh,
  visibilityClass = 'flex',
}: Props) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const addNumber = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const num = await api.post<WhatsappNumberDto>('/numbers', { name: name.trim() });
    setName('');
    setAdding(false);
    onRefresh();
    onLink(num.id); // сразу открыть QR
  };

  return (
    <div
      className={`${visibilityClass} h-full w-full flex-col border-black/30 bg-wa-sidebar md:w-72 md:border-r`}
    >
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-wa-green">Номера</span>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <a href="/admin" className="text-xs text-gray-400 hover:text-gray-200" title="Управление">
              ⚙
            </a>
          )}
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-200" title="Выйти">
            ⎋
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {numbers.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-wa-hover ${
              selectedNumberId === n.id ? 'bg-wa-hover' : ''
            }`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sessionStatusColor[n.status]}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-gray-100">{n.name}</span>
              <span className="block truncate text-xs text-gray-400">
                {n.phone ? `+${n.phone}` : sessionStatusLabel[n.status]}
              </span>
            </span>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {n.unreadCount > 0 && (
                <span className="rounded-full bg-wa-green px-2 text-xs font-medium text-black">
                  {n.unreadCount}
                </span>
              )}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onLink(n.id);
                }}
                className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-300"
              >
                QR
              </span>
            </div>
          </button>
        ))}
        {numbers.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Нет подключённых номеров</p>
        )}
      </div>

      {isAdmin && (
        <div className="border-t border-black/30 p-3">
          {adding ? (
            <form onSubmit={addNumber} className="space-y-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название номера"
                className="w-full rounded bg-wa-dark px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-wa-green"
              />
              <div className="flex gap-2">
                <button className="flex-1 rounded bg-wa-green py-1.5 text-sm font-medium text-black">
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded bg-wa-panel py-2 text-sm text-gray-200 hover:bg-wa-hover"
            >
              + Подключить номер
            </button>
          )}
        </div>
      )}
    </div>
  );
}
