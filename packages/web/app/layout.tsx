import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import "./globals.css";

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'FreedomTalk - Modern Community Communication',
    template: '%s | FreedomTalk',
  },
  description:
    'FreedomTalk is the modern communication platform that brings people together. Build communities, share ideas, and connect in real-time.',
  keywords: [
    'communication',
    'community',
    'chat',
    'messaging',
    'discord alternative',
    'open source',
  ],
  authors: [{ name: 'FreedomTalk' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://freedomtalk.app',
    siteName: 'FreedomTalk',
    title: 'FreedomTalk - Modern Community Communication',
    description:
      'The modern communication platform for communities that care about privacy, ownership, and transparency.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreedomTalk - Modern Community Communication',
    description:
      'The modern communication platform for communities that care about privacy, ownership, and transparency.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
