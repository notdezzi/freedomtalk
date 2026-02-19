'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            gcTime: 1000 * 60 * 30, // 30 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Query keys for all features
export const queryKeys = {
  servers: {
    all: ['servers'] as const,
    list: () => [...queryKeys.servers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.servers.all, 'detail', id] as const,
    channels: (serverId: string) => ['servers', serverId, 'channels'] as const,
    members: (serverId: string) => ['servers', serverId, 'members'] as const,
  },
  channels: {
    messages: (channelId: string) => ['channels', channelId, 'messages'] as const,
    infinite: (channelId: string) => ['channels', channelId, 'messages', 'infinite'] as const,
  },
  dms: {
    all: ['dms'] as const,
    list: () => [...queryKeys.dms.all, 'list'] as const,
    messages: (channelId: string) => ['dms', channelId, 'messages'] as const,
  },
  friends: {
    all: ['friends'] as const,
    list: () => [...queryKeys.friends.all, 'list'] as const,
    requests: () => [...queryKeys.friends.all, 'requests'] as const,
    blocked: () => [...queryKeys.friends.all, 'blocked'] as const,
  },
  users: {
    profile: (userId: string) => ['users', userId, 'profile'] as const,
  },
};
