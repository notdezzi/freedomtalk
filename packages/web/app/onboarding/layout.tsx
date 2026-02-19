'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isOnboardingComplete } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect to app if onboarding is already complete
  useEffect(() => {
    if (!isLoading && isAuthenticated && isOnboardingComplete) {
      router.push('/app');
    }
  }, [isAuthenticated, isLoading, isOnboardingComplete, router]);

  if (isLoading || (!isLoading && isAuthenticated && isOnboardingComplete)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-background" />
          </div>
          <span className="text-lg font-bold">
            Freedom<span className="gradient-text">Talk</span>
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
