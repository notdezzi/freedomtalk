'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageCircle, ArrowLeft, Key, HelpCircle } from 'lucide-react';

export default function TwoFARecoveryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For demo, accept any code that looks like a backup code
    if (code.length >= 10) {
      router.push('/app');
    } else {
      setError('Invalid backup code. Please check and try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/auth/2fa/verify"
        className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to verification
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
        <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
          <Key className="w-6 h-6 text-warning" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Use Backup Code</h1>
        <p className="text-foreground-muted">
          Enter one of your backup codes to regain access to your account.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-2">
            Backup Code
          </label>
          <input
            id="code"
            type="text"
            className="input text-center text-lg tracking-wider font-mono uppercase"
            placeholder="XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
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
          disabled={isLoading || code.length < 10}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            'Recover Account'
          )}
        </button>
      </form>

      {/* Help section */}
      <div className="mt-8 p-4 rounded-xl bg-background-surface border border-border">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-foreground-subtle flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Lost your backup codes?</h4>
            <p className="text-sm text-foreground-muted">
              If you&apos;ve lost access to both your authenticator and backup codes, you&apos;ll need to{' '}
              <a href="mailto:support@freedomtalk.app" className="text-accent hover:text-accent-hover">
                contact support
              </a>{' '}
              for account recovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
