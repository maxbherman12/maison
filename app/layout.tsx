import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Maison',
  description: 'Interior design project management',
};

export const viewport: Viewport = {
  colorScheme: 'light',
  viewportFit: 'cover',
  themeColor: '#f7f6f2',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-full flex-col overflow-hidden antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
