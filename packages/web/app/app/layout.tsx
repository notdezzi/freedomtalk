'use client';

import { QueryProvider } from '@/lib/query-provider';
import { ToastContainer } from '@/components/common';
import { ModalRenderer } from '@/components/modals';
import { ConfirmDialogProvider } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/hooks/use-socket';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function SocketProvider({ children }: { children: React.ReactNode }) {
  // Initialize socket connection
  useSocket();
  return <>{children}</>;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, checkSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // Check session on mount
  useEffect(() => {
    const verifySession = async () => {
      await checkSession();
      setHasCheckedSession(true);
    };

    verifySession();
  }, [checkSession]);

  // Redirect to login if not authenticated after session check
  useEffect(() => {
    if (hasCheckedSession && !isLoading && !isAuthenticated) {
      const loginUrl = new URL('/auth/login', window.location.origin);
      loginUrl.searchParams.set('redirect', pathname);
      router.push(loginUrl.toString());
    }
  }, [hasCheckedSession, isLoading, isAuthenticated, router, pathname]);

  // Show loading state while checking session
  if (!hasCheckedSession || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <div className="text-foreground text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <QueryProvider>
      <ConfirmDialogProvider>
        <SocketProvider>
          {children}
          <ToastContainer />
          <ModalRenderer />
        </SocketProvider>
      </ConfirmDialogProvider>
    </QueryProvider>
  );
}
