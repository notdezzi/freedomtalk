'use client';

import { useEffect } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { ToastContainer } from '@/components/common';
import { useAuth } from '@/hooks/use-auth';

function AuthChecker({ children }: { children: React.ReactNode }) {
  const { checkSession } = useAuth();

  // Check session on mount to ensure auth state is loaded
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return <>{children}</>;
}

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthChecker>
        {children}
      </AuthChecker>
      <ToastContainer />
    </QueryProvider>
  );
}
