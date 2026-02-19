import { useQuery } from '@tanstack/react-query';
import { apiClient, type PermissionBreakdownResponse, type ChannelOverwriteResponse } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';

// Get permission breakdown for current user in a server
export function usePermissionBreakdown(serverId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.permissions.server(serverId || ''),
    queryFn: async (): Promise<PermissionBreakdownResponse | null> => {
      if (!serverId) return null;
      const response = await apiClient.getPermissionBreakdown(serverId);
      return response.success ? response.data || null : null;
    },
    enabled: !!serverId,
  });
}

// Get channel permission breakdown for current user
export function useChannelPermissionBreakdown(channelId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.permissions.channel(channelId || ''),
    queryFn: async (): Promise<PermissionBreakdownResponse | null> => {
      if (!channelId) return null;
      const response = await apiClient.getChannelPermissionBreakdown(channelId);
      return response.success ? response.data || null : null;
    },
    enabled: !!channelId,
  });
}

// Get channel overwrites
export function useChannelOverwrites(channelId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.permissions.overwrites(channelId || ''),
    queryFn: async (): Promise<ChannelOverwriteResponse[]> => {
      if (!channelId) return [];
      const response = await apiClient.getChannelOverwrites(channelId);
      if (response.success && response.data) {
        if ('overwrites' in response.data) {
          return response.data.overwrites;
        }
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      return [];
    },
    enabled: !!channelId,
  });
}
