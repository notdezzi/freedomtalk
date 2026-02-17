'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, XCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For demo, randomly succeed or fail
      setStatus(Math.random() > 0.3 ? 'success' : 'error');
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="animate-fade-in text-center max-w-md mx-auto">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-background" />
        </div>
        <span className="text-xl font-bold">
          Freedom<span className="gradient-text">Talk</span>
        </span>
      </div>

      {status === 'loading' && (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary-muted flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verifying your email</h1>
          <p className="text-foreground-muted">
            Please wait while we verify your email address...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Email verified!</h1>
          <p className="text-foreground-muted mb-6">
            Your email has been successfully verified. You can now access all features of FreedomTalk.
          </p>
          <Link href="/app" className="btn btn-primary">
            Continue to App
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verification failed</h1>
          <p className="text-foreground-muted mb-6">
            This verification link is invalid or has expired. Please request a new one.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/verify-pending" className="btn btn-primary">
              Resend Verification
            </Link>
            <Link href="/auth/login" className="btn btn-secondary">
              Back to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="animate-fade-in text-center max-w-md mx-auto">
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-background" />
        </div>
        <span className="text-xl font-bold">
          Freedom<span className="gradient-text">Talk</span>
        </span>
      </div>
      <div className="w-16 h-16 rounded-full bg-secondary-muted flex items-center justify-center mx-auto mb-6">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Loading...</h1>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
