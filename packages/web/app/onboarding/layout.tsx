'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { BrandLockup } from '@/components/brand/brand';

export default function OnboardingLayout({
  children }: {
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
          <BrandLockup size={32} wordmarkClassName="text-lg" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
