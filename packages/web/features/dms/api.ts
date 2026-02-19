import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';

// Get all DM channels for the current user
export function useDMChannels() {
  return useQuery({
    queryKey: queryKeys.dms.list(),
    queryFn: async () => {
      const response = await apiClient.getDMChannels();
      // API returns { success: true, data: { dmChannels: [...], total: number } }
      if (response.success && response.data) {
        if ('dmChannels' in response.data) {
          return response.data.dmChannels;
        }
        // If data is an array, return it directly
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      return [];
    },
  });
}

// Get or create a DM channel with a user
export function useCreateDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipientId: string) => {
      const response = await apiClient.createDM(recipientId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dms.list() });
    },
  });
}

// Get DM channel by ID
export function useDMChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: ['dms', 'channel', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const response = await apiClient.getDMChannel(channelId);
      return response.success ? response.data || null : null;
    },
    enabled: !!channelId,
  });
}

// Close/hide a DM channel (uses leaveDM)
export function useCloseDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await apiClient.leaveDM(channelId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dms.list() });
    },
  });
}
