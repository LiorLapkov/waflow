import { SessionStatus, type SessionStatus as SessionStatusT } from '@dljobs/shared';

/** Время сообщения ЧЧ:ММ. */
export function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export const sessionStatusLabel: Record<SessionStatusT, string> = {
  [SessionStatus.Starting]: 'Запуск…',
  [SessionStatus.ScanQr]: 'Нужен QR',
  [SessionStatus.Working]: 'Подключён',
  [SessionStatus.Failed]: 'Ошибка',
  [SessionStatus.Stopped]: 'Остановлен',
};

export const sessionStatusColor: Record<SessionStatusT, string> = {
  [SessionStatus.Starting]: 'bg-yellow-500',
  [SessionStatus.ScanQr]: 'bg-orange-500',
  [SessionStatus.Working]: 'bg-wa-green',
  [SessionStatus.Failed]: 'bg-red-500',
  [SessionStatus.Stopped]: 'bg-gray-500',
};
