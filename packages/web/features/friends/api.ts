import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';

// Get friends list
export function useFriends() {
  return useQuery({
    queryKey: queryKeys.friends.list(),
    queryFn: async () => {
      const response = await apiClient.getFriends();
      // API returns { friends: [...] }
      if (response.success && response.data) {
        return 'friends' in response.data ? response.data.friends : [];
      }
      return [];
    },
  });
}

// Get pending friend requests
export function useFriendRequests() {
  return useQuery({
    queryKey: queryKeys.friends.requests(),
    queryFn: async () => {
      const response = await apiClient.getPendingFriendRequests();
      if (response.success && response.data) {
        return response.data;
      }
      return { incoming: [], outgoing: [] };
    },
  });
}

// Get blocked users
export function useBlockedUsers() {
  return useQuery({
    queryKey: queryKeys.friends.blocked(),
    queryFn: async () => {
      const response = await apiClient.getBlockedUsers();
      // API returns { blocked: [...] }
      if (response.success && response.data) {
        return 'blocked' in response.data ? response.data.blocked : [];
      }
      return [];
    },
  });
}

// Send a friend request
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      // Search for user first to get their ID
      const searchResponse = await apiClient.searchUsers(username);
      if (!searchResponse.success || !searchResponse.data) {
        throw new Error('User not found');
      }

      const users = 'users' in searchResponse.data ? searchResponse.data.users : [];
      const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

      if (!user) {
        throw new Error('User not found');
      }

      const response = await apiClient.sendFriendRequest(user.id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}

// Accept a friend request
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requesterId: string) => {
      const response = await apiClient.acceptFriendRequest(requesterId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}

// Reject a friend request
export function useRejectFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requesterId: string) => {
      const response = await apiClient.rejectFriendRequest(requesterId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}

// Cancel a friend request
export function useCancelFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await apiClient.cancelFriendRequest(targetUserId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}

// Remove a friend
export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const response = await apiClient.removeFriend(friendId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
    },
  });
}

// Block a user
export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.blockUser(userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.blocked() });
    },
  });
}

// Unblock a user
export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.unblockUser(userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.blocked() });
    },
  });
}

// Search users
export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await apiClient.searchUsers(query);
      if (response.success && response.data) {
        return 'users' in response.data ? response.data.users : [];
      }
      return [];
    },
    enabled: query.trim().length >= 2,
  });
}
