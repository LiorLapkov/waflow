import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'waflow',
  description: 'Multi-number WhatsApp inbox',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Address-bar color on mobile browsers (matches WhatsApp dark theme).
  themeColor: '#111b21',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
