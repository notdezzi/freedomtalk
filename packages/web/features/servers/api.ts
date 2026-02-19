import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';

// Ban response type
export interface BanResponse {
  id: string;
  serverId: string;
  userId: string;
  reason: string | null;
  bannedBy: string;
  bannedByName: string | null;
  bannedByAvatar: string | null;
  bannedAt: string;
  user?: {
    id: string;
    username: string;
    avatar: string | null;
  } | null;
}

// Get all servers for the current user
export function useServers() {
  return useQuery({
    queryKey: queryKeys.servers.list(),
    queryFn: async () => {
      const response = await apiClient.getServers();
      // API returns { success: true, data: Server[] }
      if (response.success && response.data) {
        let servers: any[] = [];
        // Check if data is an array (direct) or wrapped in { servers: [...] }
        if (Array.isArray(response.data)) {
          servers = response.data;
        } else if ('servers' in response.data) {
          servers = response.data.servers;
        }
        // Sort servers by position
        return servers.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      }
      return [];
    },
  });
}

// Get a single server by ID
export function useServer(serverId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.servers.detail(serverId || ''),
    queryFn: async () => {
      if (!serverId) return null;
      const response = await apiClient.getServer(serverId);
      return response.success ? response.data || null : null;
    },
    enabled: !!serverId,
  });
}

// Get channels for a server
export function useServerChannels(serverId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.servers.channels(serverId || ''),
    queryFn: async () => {
      if (!serverId) return [];
      const response = await apiClient.getChannels(serverId);
      // API returns { success: true, data: { channels: [...], categories: [...] } }
      if (response.success && response.data) {
        if ('channels' in response.data) {
          return response.data.channels;
        }
        // If data is an array, return it directly
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      return [];
    },
    enabled: !!serverId,
  });
}

// Get channels AND categories for a server (with separate query key to avoid conflicts)
export function useServerChannelsAndCategories(serverId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.servers.channels(serverId || ''), 'with-categories'],
    queryFn: async () => {
      if (!serverId) return { channels: [], categories: [] };
      const response = await apiClient.getChannels(serverId);
      // API returns { success: true, data: { channels: [...], categories: [...] } }
      if (response.success && response.data) {
        if ('channels' in response.data && 'categories' in response.data) {
          return {
            channels: response.data.channels,
            categories: response.data.categories,
          };
        }
        // If data is an array, return as channels with empty categories
        if (Array.isArray(response.data)) {
          return { channels: response.data, categories: [] };
        }
      }
      return { channels: [], categories: [] };
    },
    enabled: !!serverId,
  });
}

// Get members for a server
export function useServerMembers(serverId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.servers.members(serverId || ''),
    queryFn: async () => {
      if (!serverId) return [];
      const response = await apiClient.getServerMembers(serverId);
      // API returns { success: true, data: { members: [...] } }
      if (response.success && response.data) {
        let members: any[] = [];
        if ('members' in response.data) {
          members = response.data.members;
        } else if (Array.isArray(response.data)) {
          members = response.data;
        }

        // Transform snake_case to camelCase for frontend
        return members.map((m: any) => ({
          id: m.id,
          serverId: m.server_id,
          userId: m.user_id,
          username: m.user?.username || m.username || 'Unknown',
          displayName: m.display_name || m.nickname || m.user?.displayName || m.user_display_name,
          avatar: m.user?.avatar || m.avatar_url || m.avatar,
          banner: m.banner_url || m.banner,
          bio: m.bio,
          roles: (m.roles || []).map((r: any) => r.id || r),
          joinedAt: m.joined_at || m.joinedAt,
          isOwner: m.is_owner || m.isOwner || false,
          isOnline: m.isOnline ?? (m.status === 'online'),
          status: m.status || (m.isOnline ? 'online' : 'offline'),
          customStatus: m.custom_status || m.customStatus,
        }));
      }
      return [];
    },
    enabled: !!serverId,
  });
}

// Create a new server
export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; icon?: string }) => {
      const response = await apiClient.createServer({
        name: data.name,
        iconUrl: data.icon,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
    },
  });
}

// Update a server
export function useUpdateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, data }: { serverId: string; data: { name?: string; description?: string; iconUrl?: string | null } }) => {
      const response = await apiClient.updateServer(serverId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.detail(variables.serverId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
    },
  });
}

// Leave a server
export function useLeaveServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const response = await apiClient.leaveServer(serverId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
    },
  });
}

// Delete a server (owner only)
export function useDeleteServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const response = await apiClient.deleteServer(serverId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
    },
  });
}

// Join a server via invite code
export function useJoinServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const response = await apiClient.joinServer(inviteCode);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
    },
  });
}

// Get invite info
export function useInviteInfo(inviteCode: string | undefined) {
  return useQuery({
    queryKey: ['invite', inviteCode],
    queryFn: async () => {
      if (!inviteCode) return null;
      const response = await apiClient.previewInvite(inviteCode);
      return response.success ? response.data || null : null;
    },
    enabled: !!inviteCode,
  });
}

// Update server positions (for drag and drop)
export function useUpdateServerPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positions: { id: string; position: number }[]) => {
      const response = await apiClient.updateServerPositions(positions);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
    },
  });
}

// Update channel positions (for drag and drop)
export function useUpdateChannelPositions(serverId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positions: { id: string; position: number; categoryId?: string | null }[]) => {
      if (!serverId) throw new Error('Server ID is required');
      const response = await apiClient.updateChannelPositions(serverId, positions);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate channels query to refetch with new positions
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.channels(serverId || '') });
    },
  });
}

// Update category positions (for drag and drop)
export function useUpdateCategoryPositions(serverId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positions: { id: string; position: number }[]) => {
      if (!serverId) throw new Error('Server ID is required');
      const response = await apiClient.updateCategoryPositions(serverId, positions);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate channels query to refetch with new positions (categories are included)
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.channels(serverId || '') });
    },
  });
}

// Kick a member from the server
export function useKickMember(serverId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!serverId) throw new Error('Server ID is required');
      const response = await apiClient.kickMember(serverId, userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.members(serverId || '') });
    },
  });
}

// Ban a member from the server
export function useBanMember(serverId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      if (!serverId) throw new Error('Server ID is required');
      const response = await apiClient.banMember(serverId, userId, reason);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.members(serverId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.bans.list(serverId || '') });
    },
  });
}

// Unban a user from the server
export function useUnbanMember(serverId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!serverId) throw new Error('Server ID is required');
      const response = await apiClient.unbanMember(serverId, userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bans.list(serverId || '') });
    },
  });
}

// Get all bans for a server
export function useServerBans(serverId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bans.list(serverId || ''),
    queryFn: async (): Promise<BanResponse[]> => {
      if (!serverId) return [];
      const response = await apiClient.getBans(serverId);
      if (response.success && response.data) {
        // Handle both array and object responses
        let bans: any[] = [];
        if (Array.isArray(response.data)) {
          bans = response.data;
        } else if ('bans' in response.data && Array.isArray(response.data.bans)) {
          bans = response.data.bans;
        }

        // Transform snake_case to camelCase for frontend
        return bans.map((b: any) => ({
          id: b.id,
          serverId: b.server_id,
          userId: b.user_id,
          reason: b.reason,
          bannedBy: b.banned_by,
          bannedByName: b.banned_by_name || b.bannedBy?.username || null,
          bannedByAvatar: b.banned_by_avatar || b.bannedBy?.avatar || null,
          bannedAt: b.created_at || b.bannedAt || b.banned_at,
          user: b.user ? {
            id: b.user.id,
            username: b.user.username,
            avatar: b.user.avatar,
          } : null,
        }));
      }
      return [];
    },
    enabled: !!serverId,
  });
}

// Get all invites for a server
export function useServerInvites(serverId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.servers.invites(serverId || ''),
    queryFn: async () => {
      if (!serverId) return [];
      const response = await apiClient.getInvites(serverId);
      if (response.success && response.data) {
        // Handle both array and object responses
        if (Array.isArray(response.data)) {
          return response.data;
        } else if ('invites' in response.data && Array.isArray(response.data.invites)) {
          return response.data.invites;
        }
      }
      return [];
    },
    enabled: !!serverId,
  });
}

// Delete an invite
export function useDeleteInvite(serverId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!serverId) throw new Error('Server ID is required');
      const response = await apiClient.deleteInvite(serverId, inviteId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.invites(serverId || '') });
    },
  });
}

// Create an invite
export function useCreateInvite(serverId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data?: {
      channelId?: string;
      maxUses?: number;
      maxAge?: number;
      temporary?: boolean;
    }) => {
      if (!serverId) throw new Error('Server ID is required');
      const response = await apiClient.createInvite(serverId, data);
      return response.data;
    },
    onSuccess: () => {
      if (serverId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.servers.invites(serverId) });
      }
    },
  });
}
