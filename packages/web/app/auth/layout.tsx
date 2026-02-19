'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircle, Check } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <div className="text-foreground-muted text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  const features = [
    'Real-time messaging with zero lag',
    'End-to-end encryption',
    'Open source & transparent',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-background-elevated">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-secondary/20" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float delay-500" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-background" />
              </div>
              <span className="text-2xl font-bold">
                Freedom<span className="gradient-text">Talk</span>
              </span>
            </div>

            <h2 className="text-3xl font-bold mb-4">
              Welcome to <span className="gradient-text">FreedomTalk</span>
            </h2>
            <p className="text-lg text-foreground-muted max-w-md">
              Join thousands of communities connecting, sharing, and building together.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="mt-12 space-y-6">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-accent" />
                </div>
                <span className="text-foreground-muted">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
