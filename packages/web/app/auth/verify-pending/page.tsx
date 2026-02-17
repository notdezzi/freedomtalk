'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function VerifyPendingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSent(true);
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-background" />
        </div>
        <span className="text-xl font-bold">
          Freedom<span className="gradient-text">Talk</span>
        </span>
      </div>

      {isSent ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verification email sent!</h1>
          <p className="text-foreground-muted mb-6">
            We&apos;ve sent a new verification email to{' '}
            <span className="text-foreground font-medium">{email}</span>
          </p>
          <p className="text-sm text-foreground-subtle">
            Please check your inbox and spam folder.
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary-muted flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
            <p className="text-foreground-muted">
              Enter your email address and we&apos;ll send you a new verification link.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleResend} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-subtle" />
                <input
                  id="email"
                  type="email"
                  className="input pl-12"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                'Resend Verification Email'
              )}
            </button>
          </form>
        </>
      )}

      {/* Help text */}
      <div className="mt-8 p-4 rounded-xl bg-background-surface border border-border">
        <h3 className="font-medium mb-2 text-sm">Need help?</h3>
        <ul className="text-sm text-foreground-muted space-y-1">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email</li>
          <li>
            Contact{' '}
            <a href="mailto:support@freedomtalk.app" className="text-accent hover:text-accent-hover">
              support@freedomtalk.app
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
