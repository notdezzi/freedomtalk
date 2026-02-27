'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Zap } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#narrative-1' },
  { label: 'Architecture', href: '#system-depth' },
  { label: 'Community', href: '#cta' },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-energy to-energy-dim flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Zap className="w-5 h-5 text-background" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-energy/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold leading-none">
                Freedom<span className="text-energy">Talk</span>
              </span>
              <span className="text-[10px] text-foreground-subtle tracking-wider uppercase">
                Infrastructure
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-energy transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="btn btn-ghost text-sm">
              Log In
            </Link>
            <Link href="/auth/register" className="btn btn-primary text-sm">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border transition-all duration-300 ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-foreground-muted hover:text-foreground transition-colors py-2"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-border space-y-3">
            <Link
              href="/auth/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-center py-2.5 text-foreground-muted hover:text-foreground transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-center btn btn-primary w-full"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
