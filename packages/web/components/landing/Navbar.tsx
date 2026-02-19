'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <MessageCircle className="w-5 h-5 text-background" />
            </div>
            <span className="text-lg font-bold">
              Freedom<span className="gradient-text">Talk</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#why-us" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
              Why Us
            </Link>
            <Link href="#community" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
              Community
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn btn-ghost text-sm">
              Log In
            </Link>
            <Link href="/auth/register" className="btn btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
