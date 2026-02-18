'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { Eye, EyeOff, MessageCircle, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithEmail, verifyMfa } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const registered = searchParams.get('registered');

  // Check if MFA code input should auto-focus
  useEffect(() => {
    if (mfaRequired) {
      // Focus the MFA input when it appears
      const input = document.getElementById('mfa-code');
      if (input) input.focus();
    }
  }, [mfaRequired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginWithEmail(formData.email, formData.password);

      if (!result.success) {
        setError(result.error || 'Login failed');
      } else if (result.mfaRequired) {
        setMfaRequired(true);
        setMfaSessionId(result.sessionId || null);
      }
      // On success, the useAuth hook handles the redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    setIsLoading(true);

    try {
      if (!mfaSessionId || mfaCode.length !== 6) {
        setMfaError('Please enter a valid 6-digit code');
        return;
      }

      const result = await verifyMfa(mfaSessionId, mfaCode);

      if (!result.success) {
        setMfaError(result.error || 'Verification failed');
      }
      // On success, the useAuth hook handles the redirect
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'MFA verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // MFA verification form
  if (mfaRequired) {
    return (
      <div className="animate-fade-in">
        {/* Back link */}
        <button
          onClick={() => {
            setMfaRequired(false);
            setMfaSessionId(null);
            setMfaCode('');
            setMfaError(null);
          }}
          className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Two-Factor Authentication</h1>
          <p className="text-foreground-muted">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {mfaError && (
          <div id="mfa-error" className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3" role="alert">
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <p className="text-sm text-error">{mfaError}</p>
          </div>
        )}

        <form onSubmit={handleMfaSubmit} className="space-y-6">
          <div>
            <label htmlFor="mfa-code" className="block text-sm font-medium mb-2">
              Authentication Code
            </label>
            <input
              id="mfa-code"
              type="text"
              className="input text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="000000"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(6))}
              maxLength={6}
              required
              aria-describedby={mfaError ? 'mfa-error' : undefined}
              aria-invalid={!!mfaError}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading || mfaCode.length !== 6}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify'
            )}
          </button>

          <p className="text-center text-sm text-foreground-muted">
            Lost access to your authenticator?{' '}
            <Link href="/auth/2fa/recovery" className="text-accent hover:text-accent-hover transition-colors">
              Use a backup code
            </Link>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
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
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-foreground-muted">
          Enter your credentials to access your account
        </p>
      </div>

      {/* Registration success message */}
      {registered && (
        <div className="mb-6 p-4 rounded-lg bg-success/10 border border-success/20 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <p className="text-sm text-success">
            Account created successfully! Please check your email to verify your account, then log in.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div id="login-error" className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={isLoading}
            aria-describedby={error ? 'login-error' : undefined}
            aria-invalid={!!error}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-12"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={!!error}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border bg-background-surface accent-accent"
            />
            <span className="text-sm text-foreground-muted">Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-foreground-subtle">or continue with</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Social login */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            // Redirect to Google OAuth
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google/authorize`;
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            // Redirect to GitHub OAuth
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/github/authorize`;
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>

      {/* Sign up link */}
      <p className="mt-8 text-center text-sm text-foreground-muted">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="text-accent hover:text-accent-hover transition-colors font-medium"
        >
          Sign up for free
        </Link>
      </p>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
