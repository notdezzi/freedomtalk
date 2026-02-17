'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircle, CheckCircle, XCircle } from 'lucide-react';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const provider = searchParams.get('provider') || 'oauth';

  useEffect(() => {
    const handleCallback = async () => {
      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      try {
        // Simulate API call to exchange code for token
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // For demo, randomly succeed or fail
        if (Math.random() > 0.2) {
          setStatus('success');
          setTimeout(() => {
            router.push('/app');
          }, 1500);
        } else {
          throw new Error('Authentication failed');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [code, state, router]);

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
          <h1 className="text-2xl font-bold mb-2">Connecting to {provider}</h1>
          <p className="text-foreground-muted">
            Please wait while we complete your authentication...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Successfully connected!</h1>
          <p className="text-foreground-muted">
            Redirecting you to the app...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Authentication failed</h1>
          <p className="text-foreground-muted mb-2">
            {error || 'Something went wrong during authentication.'}
          </p>
          <p className="text-sm text-foreground-subtle mb-6">
            Please try again or contact support if the problem persists.
          </p>
          <a href="/auth/login" className="btn btn-primary">
            Back to Login
          </a>
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

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
