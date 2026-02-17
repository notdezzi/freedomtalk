'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageCircle, ArrowLeft, Shield, Key } from 'lucide-react';

export default function TwoFAVerifyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For demo, accept any 6-digit code
    if (code.length === 6 && /^\d+$/.test(code)) {
      router.push('/app');
    } else {
      setError('Invalid verification code. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Use another account
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
        <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Two-Factor Authentication</h1>
        <p className="text-foreground-muted">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-2">
            Authentication Code
          </label>
          <input
            id="code"
            type="text"
            className="input text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
            required
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            'Verify'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/2fa/recovery"
          className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-accent transition-colors"
        >
          <Key className="w-4 h-4" />
          Lost access? Use a backup code
        </Link>
      </div>
    </div>
  );
}
