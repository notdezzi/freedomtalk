'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, MessageCircle, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-foreground-muted mb-6">
          We&apos;ve sent a password reset link to{' '}
          <span className="text-foreground font-medium">{email}</span>
        </p>
        <p className="text-sm text-foreground-subtle mb-6">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-accent hover:text-accent-hover"
          >
            try another email address
          </button>
        </p>
        <Link href="/auth/login" className="btn btn-secondary">
          Back to Login
        </Link>
      </div>
    );
  }

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

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Forgot your password?</h1>
        <p className="text-foreground-muted">
          No worries, we&apos;ll send you reset instructions.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
            'Reset Password'
          )}
        </button>
      </form>

      {/* Sign up link */}
      <p className="mt-8 text-center text-sm text-foreground-muted">
        Remember your password?{' '}
        <Link
          href="/auth/login"
          className="text-accent hover:text-accent-hover transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
