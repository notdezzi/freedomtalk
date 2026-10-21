'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, Star } from 'lucide-react';
import { LogoMark } from './illustrations';

const GITHUB_REPO = 'https://github.com/notdezzi/freedomtalk';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Voice', href: '#hang-out' },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // While the sheet is open: lock the page behind it, close on Escape,
  // and never stay open across the desktop breakpoint.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 900) setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen]);

  return (
    <>
      <nav className={`ftl-nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="ftl-container">
          <div className="ftl-nav-inner">
            <Link
              href="/"
              className="ftl-logo"
              aria-label="FreedomTalk home"
            >
              <LogoMark />
              <span className="ftl-logo-word">
                Freedom<span style={{ color: 'var(--ftl-blurple)' }}>Talk</span>
              </span>
            </Link>

            <div className="ftl-nav-links">
              {navLinks.map((link) => (
                <Link key={link.label} href={link.href} className="ftl-nav-link">
                  {link.label}
                </Link>
              ))}
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="ftl-os-badge">
                <Star size={11} fill="currentColor" strokeWidth={0} />
                Open source
              </a>
            </div>

            <div className="ftl-nav-actions">
              <Link href="/auth/login" className="ftl-nav-link">
                Log in
              </Link>
              <Link href="/app" className="ftl-btn ftl-btn-primary ftl-btn-sm">
                Open in browser
              </Link>
            </div>

            <button
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
              aria-controls="ftl-mobile-menu"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              className="ftl-nav-toggle"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <div id="ftl-mobile-menu" className={`ftl-mobile-menu ${isOpen ? 'is-open' : ''}`}>
        {navLinks.map((link) => (
          <a key={link.label} href={link.href} onClick={() => setIsOpen(false)}>
            {link.label}
          </a>
        ))}
        <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}>
          Open source ↗
        </a>
        <a href="/auth/login" onClick={() => setIsOpen(false)}>
          Log in
        </a>
        <Link href="/app" className="ftl-btn ftl-btn-primary" style={{ marginTop: '0.75rem', width: '100%' }}>
          Open in browser
        </Link>
      </div>
    </>
  );
}
