'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, checkSession } = useAuth();
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);

  // Check session on mount
  useEffect(() => {
    const verify = async () => {
      await checkSession();
      setHasChecked(true);
    };
    verify();
  }, [checkSession]);

  // Redirect to /app if already authenticated
  useEffect(() => {
    if (hasChecked && !isLoading && isAuthenticated) {
      router.push('/app');
    }
  }, [hasChecked, isLoading, isAuthenticated, router]);

  // Show loading while checking session
  if (!hasChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <div className="text-white text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-900">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gray-800">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div
          className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 text-white">
              Welcome to <span className="text-blue-400">FreedomTalk</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-md">
              Join thousands of communities connecting, sharing, and building together.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="mt-12 space-y-6">
            {[
              'Real-time messaging with zero lag',
              'End-to-end encryption',
              'Open source & transparent',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-gray-400">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
