'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useCrm } from '@/lib/useCrm';
import { NumbersColumn } from '@/components/NumbersColumn';
import { ChatsColumn } from '@/components/ChatsColumn';
import { Conversation } from '@/components/Conversation';
import { QrModal } from '@/components/QrModal';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const crm = useCrm();
  const [qrNumberId, setQrNumberId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }

  // On mobile a single screen at a time; on desktop (md+) all three side-by-side.
  // `100dvh` plays nice with the mobile keyboard and browser chrome.
  const show = (view: 'numbers' | 'chats' | 'conversation') =>
    crm.mobileView === view ? 'flex md:flex' : 'hidden md:flex';

  return (
    <div className="flex h-[100dvh]">
      <NumbersColumn
        numbers={crm.numbers}
        selectedNumberId={crm.selectedNumberId}
        onSelect={crm.selectNumber}
        onLink={setQrNumberId}
        onRefresh={crm.loadNumbers}
        visibilityClass={show('numbers')}
      />
      <ChatsColumn
        chats={crm.chats}
        selectedChatId={crm.selectedChatId}
        hasNumber={!!crm.selectedNumberId}
        onSelect={crm.selectChat}
        onBack={crm.goBack}
        visibilityClass={show('chats')}
      />
      <Conversation
        chat={crm.selectedChat}
        messages={crm.messages}
        onSend={crm.sendText}
        onBack={crm.goBack}
        visibilityClass={show('conversation')}
      />

      {qrNumberId && (
        <QrModal
          numberId={qrNumberId}
          onClose={() => setQrNumberId(null)}
          onLinked={crm.loadNumbers}
        />
      )}
    </div>
  );
}
