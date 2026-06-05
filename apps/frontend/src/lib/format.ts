import { SessionStatus, type SessionStatus as SessionStatusT } from '@waflow/shared';

/** Message time as HH:MM. */
export function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const sessionStatusLabel: Record<SessionStatusT, string> = {
  [SessionStatus.Starting]: 'Starting…',
  [SessionStatus.ScanQr]: 'Scan QR',
  [SessionStatus.Working]: 'Connected',
  [SessionStatus.Failed]: 'Error',
  [SessionStatus.Stopped]: 'Stopped',
};

export const sessionStatusColor: Record<SessionStatusT, string> = {
  [SessionStatus.Starting]: 'bg-yellow-500',
  [SessionStatus.ScanQr]: 'bg-orange-500',
  [SessionStatus.Working]: 'bg-wa-green',
  [SessionStatus.Failed]: 'bg-red-500',
  [SessionStatus.Stopped]: 'bg-gray-500',
};
