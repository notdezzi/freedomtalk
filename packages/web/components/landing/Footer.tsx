'use client';

import Link from 'next/link';
import { Zap, Github, Twitter, MessageCircle } from 'lucide-react';

const footerLinks = {
  product: [
    { label: 'Features', href: '#narrative-1' },
    { label: 'Architecture', href: '#system-depth' },
    { label: 'Documentation', href: '/docs' },
    { label: 'Changelog', href: '/changelog' },
  ],
  resources: [
    { label: 'API Reference', href: '/api' },
    { label: 'Self-Hosting', href: '/docs/self-hosting' },
    { label: 'Contributing', href: '/contributing' },
    { label: 'Status', href: '/status' },
  ],
  community: [
    { label: 'Discord', href: '/invite' },
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'Twitter', href: 'https://twitter.com' },
    { label: 'Blog', href: '/blog' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'License (MIT)', href: '/license' },
  ],
};

const socialLinks = [
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: MessageCircle, href: '/invite', label: 'Discord' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background-warm/30">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-energy/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-energy to-energy-dim flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <Zap className="w-5 h-5 text-background" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold leading-none">
                  Freedom<span className="text-energy">Talk</span>
                </span>
              </div>
            </Link>

            <p className="text-sm text-foreground-muted mb-6 max-w-xs leading-relaxed">
              Communication infrastructure that belongs to you. Open source, self-hosted,
              end-to-end encrypted.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target={social.href.startsWith('http') ? '_blank' : undefined}
                    rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="w-10 h-10 rounded-lg bg-background-surface/50 border border-border flex items-center justify-center text-foreground-muted hover:text-energy hover:border-energy/30 hover:bg-energy-muted transition-all duration-300"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          <div>
            <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-foreground-subtle mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-foreground-subtle mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-foreground-subtle mb-4">
              Community
            </h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-foreground-subtle mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-foreground-subtle">
            © {new Date().getFullYear()} FreedomTalk. MIT License.
          </p>

          <div className="flex items-center gap-6 text-sm text-foreground-subtle">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              All systems operational
            </span>
            <Link href="/status" className="hover:text-foreground transition-colors">
              View status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
