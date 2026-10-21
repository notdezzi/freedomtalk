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

  // Show loading only while the INITIAL session check runs. Gating on
  // isLoading here would unmount the login/register page on every submit
  // attempt (loginUser/registerUser set isLoading), wiping the form and the
  // error message the user is supposed to see.
  if (!hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[480px]">{children}</div>
    </div>
  );
}
