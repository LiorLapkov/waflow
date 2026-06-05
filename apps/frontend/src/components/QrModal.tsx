'use client';

import { useEffect, useState } from 'react';
import { SessionStatus, type QrDto } from '@dljobs/shared';
import { api } from '@/lib/api';
import { sessionStatusLabel } from '@/lib/format';

interface Props {
  numberId: string;
  onClose: () => void;
  onLinked: () => void;
}

export function QrModal({ numberId, onClose, onLinked }: Props) {
  const [qr, setQr] = useState<QrDto | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await api.get<QrDto>(`/numbers/${numberId}/qr`);
        if (!active) return;
        setQr(data);
        if (data.status === SessionStatus.Working) {
          onLinked();
        }
      } catch {
        // игнорируем разовые ошибки опроса
      }
    };
    void poll();
    const id = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [numberId, onLinked]);

  const working = qr?.status === SessionStatus.Working;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-4 rounded-lg bg-wa-panel p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-gray-100">Линковка номера</h2>
        {working ? (
          <p className="py-8 text-wa-green">✓ Номер подключён</p>
        ) : qr?.qr ? (
          <>
            <img src={qr.qr} alt="QR" className="mx-auto h-56 w-56 rounded bg-white p-2" />
            <p className="text-xs text-gray-400">
              Откройте WhatsApp → Связанные устройства → Привязать устройство
            </p>
          </>
        ) : (
          <p className="py-8 text-sm text-gray-400">
            {qr ? sessionStatusLabel[qr.status] : 'Получение QR…'}
          </p>
        )}
        <button onClick={onClose} className="w-full rounded bg-wa-dark py-2 text-sm text-gray-200 hover:bg-wa-hover">
          Закрыть
        </button>
      </div>
    </div>
  );
}
