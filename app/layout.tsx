import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Italiana, Jost } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const italiana = Italiana({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-italiana',
});
const jost = Jost({ subsets: ['latin'], variable: '--font-jost' });

export const metadata: Metadata = {
  title: 'Maison',
  description: 'Interior design project management',
};

export const viewport: Viewport = {
  colorScheme: 'light',
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${italiana.variable} ${jost.variable}`}>
      <body className="flex h-full flex-col overflow-hidden antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
