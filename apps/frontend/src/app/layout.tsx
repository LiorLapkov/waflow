import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'DLJobs WhatsApp CRM',
  description: 'Внутренняя панель операторов DLJobs',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Цвет адресной строки на мобильных браузерах (как у самого WhatsApp).
  themeColor: '#111b21',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
