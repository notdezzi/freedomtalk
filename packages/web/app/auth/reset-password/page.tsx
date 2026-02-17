'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, MessageCircle, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordRequirements.every((req) => req.test(formData.password))) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.resetPassword(token, formData.password);

      if (response.success) {
        setIsSuccess(true);
      } else {
        setError(response.error?.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
        <p className="text-foreground-muted mb-6">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/auth/forgot-password" className="btn btn-primary">
          Request New Link
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Password reset!</h1>
        <p className="text-foreground-muted mb-6">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Link href="/auth/login" className="btn btn-primary">
          Continue to Login
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
        <h1 className="text-2xl font-bold mb-2">Set new password</h1>
        <p className="text-foreground-muted">
          Your new password must be different from previous passwords.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-12"
              placeholder="Enter new password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password requirements */}
          {formData.password && (
            <div className="mt-3 space-y-2">
              {passwordRequirements.map((req) => (
                <div
                  key={req.label}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    req.test(formData.password) ? 'text-accent' : 'text-foreground-subtle'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {req.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              className="input pr-12"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="animate-fade-in text-center">
      <div className="w-16 h-16 rounded-full bg-secondary-muted flex items-center justify-center mx-auto mb-6">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Loading...</h1>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
