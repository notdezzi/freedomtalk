import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Noto_Sans, Baloo_2, Nunito } from 'next/font/google';
import "./globals.css";

// Ships the 'gg sans' stack's free stand-in; the stack in globals.css
// prefers a locally installed gg sans before falling back to this.
const ggSans = Noto_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-gg',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

const baloo = Baloo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-baloo',
  weight: ['400', '500', '600', '700', '800'],
});

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
});

export const viewport: Viewport = {
  themeColor: '#121214',
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ggSans.variable} ${jetbrainsMono.variable} ${baloo.variable} ${nunito.variable}`}
    >
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
