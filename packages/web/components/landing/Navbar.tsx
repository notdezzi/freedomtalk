'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, MessageCircle } from 'lucide-react';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#why-us', label: 'Why Us' },
  { href: '#pricing', label: 'Pricing' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center group-hover:animate-pulse-glow transition-all">
                <MessageCircle className="w-5 h-5 text-background" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight">
              Freedom<span className="gradient-text">Talk</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-foreground-muted hover:text-foreground transition-colors text-sm font-medium"
              >
                {link.label}
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
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-foreground-muted hover:text-foreground transition-colors text-sm font-medium py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Link
                  href="/auth/login"
                  className="btn btn-secondary text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/auth/register"
                  className="btn btn-primary text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
