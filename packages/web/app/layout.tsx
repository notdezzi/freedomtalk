import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono, Syne } from 'next/font/google';
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

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
});

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'FreedomTalk - Infrastructure for Connection',
    template: '%s | FreedomTalk',
  },
  description:
    'Communication infrastructure that belongs to you. Self-hosted, encrypted, transparent. Build communities on a platform designed for trust.',
  keywords: [
    'communication',
    'community',
    'chat',
    'messaging',
    'discord alternative',
    'open source',
    'self-hosted',
    'encrypted',
  ],
  authors: [{ name: 'FreedomTalk' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://freedomtalk.app',
    siteName: 'FreedomTalk',
    title: 'FreedomTalk - Infrastructure for Connection',
    description:
      'Communication infrastructure that belongs to you. Self-hosted, encrypted, transparent.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreedomTalk - Infrastructure for Connection',
    description:
      'Communication infrastructure that belongs to you. Self-hosted, encrypted, transparent.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable} ${syne.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
