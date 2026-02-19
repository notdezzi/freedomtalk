import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';

export interface Friend {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  customStatus: string | null;
  friendSince: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
}

export interface PendingFriendRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestedAt: string;
}

export interface BlockedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface SearchedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isFriend: boolean;
  hasPendingRequest: boolean;
  isBlocked: boolean;
}

interface FriendState {
  friends: Friend[];
  incomingRequests: PendingFriendRequest[];
  outgoingRequests: PendingFriendRequest[];
  blockedUsers: BlockedUser[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchFriends: () => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  sendFriendRequest: (targetUserId: string) => Promise<boolean>;
  acceptFriendRequest: (requesterId: string) => Promise<boolean>;
  rejectFriendRequest: (requesterId: string) => Promise<boolean>;
  cancelFriendRequest: (targetUserId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  blockUser: (targetUserId: string) => Promise<boolean>;
  unblockUser: (targetUserId: string) => Promise<boolean>;
  searchUsers: (query: string) => Promise<SearchedUser[]>;
  getFriendshipStatus: (targetUserId: string) => Promise<{ isFriend: boolean; hasIncomingRequest: boolean; hasOutgoingRequest: boolean; isBlocked: boolean } | null>;

  // Realtime update methods
  addIncomingRequest: (request: PendingFriendRequest) => void;
  removeIncomingRequest: (userId: string) => void;
  removeOutgoingRequest: (userId: string) => void;
  addFriend: (friend: Friend) => void;
  removeFriendFromList: (friendId: string) => void;
  addBlockedUser: (user: BlockedUser) => void;
  removeBlockedUserFromList: (userId: string) => void;

  // Helpers
  isFriend: (userId: string) => boolean;
  hasPendingRequest: (userId: string) => boolean;
  isBlocked: (userId: string) => boolean;
  clearError: () => void;
}

// Track in-flight requests to prevent duplicates
let friendsFetchPromise: Promise<void> | null = null;
let pendingRequestsFetchPromise: Promise<void> | null = null;
let blockedUsersFetchPromise: Promise<void> | null = null;

export const useFriendStore = create<FriendState>()(
  persist(
    (set, get) => ({
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      blockedUsers: [],
      loading: false,
      error: null,

      fetchFriends: async () => {
        // If already fetching, return existing promise
        if (friendsFetchPromise) {
          return friendsFetchPromise;
        }

        // If we already have friends, don't fetch again
        if (get().friends.length > 0) {
          return;
        }

        set({ loading: true, error: null });

        friendsFetchPromise = (async () => {
          try {
            const response = await apiClient.getFriends();

            if (response.success && response.data) {
              set({ friends: response.data.friends, loading: false });
            } else {
              set({
                error: response.error?.message || 'Failed to fetch friends',
                loading: false,
              });
            }
          } finally {
            friendsFetchPromise = null;
          }
        })();

        return friendsFetchPromise;
      },

      fetchPendingRequests: async () => {
        // If already fetching, return existing promise
        if (pendingRequestsFetchPromise) {
          return pendingRequestsFetchPromise;
        }

        // If we already have pending requests data, don't fetch again
        const state = get();
        if (state.incomingRequests.length > 0 || state.outgoingRequests.length > 0) {
          return;
        }

        set({ loading: true, error: null });

        pendingRequestsFetchPromise = (async () => {
          try {
            const response = await apiClient.getPendingFriendRequests();

            if (response.success && response.data) {
              set({
                incomingRequests: response.data.incoming,
                outgoingRequests: response.data.outgoing,
                loading: false,
              });
            } else {
              set({
                error: response.error?.message || 'Failed to fetch pending requests',
                loading: false,
              });
            }
          } finally {
            pendingRequestsFetchPromise = null;
          }
        })();

        return pendingRequestsFetchPromise;
      },

      fetchBlockedUsers: async () => {
        // If already fetching, return existing promise
        if (blockedUsersFetchPromise) {
          return blockedUsersFetchPromise;
        }

        // If we already have blocked users data, don't fetch again
        if (get().blockedUsers.length > 0) {
          return;
        }

        set({ loading: true, error: null });

        blockedUsersFetchPromise = (async () => {
          try {
            const response = await apiClient.getBlockedUsers();

            if (response.success && response.data) {
              set({ blockedUsers: response.data.blocked, loading: false });
            } else {
              set({
                error: response.error?.message || 'Failed to fetch blocked users',
                loading: false,
              });
            }
          } finally {
            blockedUsersFetchPromise = null;
          }
        })();

        return blockedUsersFetchPromise;
      },

      sendFriendRequest: async (targetUserId: string) => {
        set({ loading: true, error: null });

        const response = await apiClient.sendFriendRequest(targetUserId);

        if (response.success) {
          // Refresh pending requests to show the new outgoing request
          await get().fetchPendingRequests();
          return true;
        } else {
          set({
            error: response.error?.message || 'Failed to send friend request',
            loading: false,
          });
          return false;
        }
      },

      acceptFriendRequest: async (requesterId: string) => {
        set({ loading: true, error: null });

        const response = await apiClient.acceptFriendRequest(requesterId);

        if (response.success) {
          // Refresh both friends and pending requests
          await Promise.all([
            get().fetchFriends(),
            get().fetchPendingRequests(),
          ]);
          return true;
        } else {
          set({
            error: response.error?.message || 'Failed to accept friend request',
            loading: false,
          });
          return false;
        }
      },

      rejectFriendRequest: async (requesterId: string) => {
        set({ loading: true, error: null });

        const response = await apiClient.rejectFriendRequest(requesterId);

        if (response.success) {
          // Refresh pending requests
          await get().fetchPendingRequests();
          return true;
        } else {
          set({
            error: response.error?.message || 'Failed to reject friend request',
            loading: false,
          });
          return false;
        }
      },

      cancelFriendRequest: async (targetUserId: string) => {
        set({ loading: true, error: null });

        const response = await apiClient.cancelFriendRequest(targetUserId);

        if (response.success) {
          // Refresh pending requests
          await get().fetchPendingRequests();
          return true;
        } else {
          set({
            error: response.error?.message || 'Failed to cancel friend request',
            loading: false,
          });
          return false;
        }
      },

      removeFriend: async (friendId: string) => {
        set({ loading: true, error: null });

        const response = await apiClient.removeFriend(friendId);

        if (response.success) {
          // Refresh friends list
          await get().fetchFriends();
          return true;
        } else {
          set({
            error: response.error?.message || 'Failed to remove friend',
            loading: false,
          });
          return false;
        }
      },

      blockUser: async (targetUserId: string) => {
        set({ loading: true, error: null });

        const response = await apiClient.blockUser(targetUserId);

        if (response.success) {
          // Refresh all related data
          await Promise.all([
            get().fetchFriends(),
            get().fetchPendingRequests(),
            get().fetchBlockedUsers(),
          ]);
          return true;
        } else {
          set({
            error: response.error?.message || 'Failed to block user',
            loading: false,
          });
          return false;
        }
      },

      unblockUser: async (targetUserId: string) => {
        set({ loading: true, error: null });

        const response = await apiClient.unblockUser(targetUserId);

        if (response.success) {
          // Refresh blocked users
          await get().fetchBlockedUsers();
          return true;
        } else {
          set({
            error: response.error?.message || 'Failed to unblock user',
            loading: false,
          });
          return false;
        }
      },

      searchUsers: async (query: string) => {
        if (!query || query.length < 2) {
          return [];
        }

        // Use the new endpoint that only searches within friends
        const response = await apiClient.searchWithinFriends(query);

        if (response.success && response.data) {
          // Map the friends response to SearchedUser format
          return response.data.friends.map(friend => ({
            id: friend.id,
            username: friend.username,
            displayName: friend.displayName,
            avatarUrl: friend.avatarUrl,
            isFriend: true,
            hasPendingRequest: false,
            isBlocked: false,
          }));
        }

        return [];
      },

      getFriendshipStatus: async (targetUserId: string) => {
        const response = await apiClient.getFriendshipStatus(targetUserId);

        if (response.success && response.data) {
          return response.data;
        }

        return null;
      },

      isFriend: (userId: string) => {
        return get().friends.some((f) => f.id === userId);
      },

      hasPendingRequest: (userId: string) => {
        const state = get();
        return (
          state.incomingRequests.some((r) => r.userId === userId) ||
          state.outgoingRequests.some((r) => r.userId === userId)
        );
      },

      isBlocked: (userId: string) => {
        return get().blockedUsers.some((u) => u.id === userId);
      },

      // Realtime update methods
      addIncomingRequest: (request) => set((state) => {
        // Don't add if already exists
        if (state.incomingRequests.some((r) => r.userId === request.userId)) {
          return state;
        }
        return {
          incomingRequests: [...state.incomingRequests, request],
        };
      }),

      removeIncomingRequest: (userId) => set((state) => ({
        incomingRequests: state.incomingRequests.filter((r) => r.userId !== userId),
      })),

      removeOutgoingRequest: (userId) => set((state) => ({
        outgoingRequests: state.outgoingRequests.filter((r) => r.userId !== userId),
      })),

      addFriend: (friend) => set((state) => {
        // Don't add if already exists
        if (state.friends.some((f) => f.id === friend.id)) {
          return state;
        }
        // Remove from incoming/outgoing requests if present
        return {
          friends: [...state.friends, friend],
          incomingRequests: state.incomingRequests.filter((r) => r.userId !== friend.id),
          outgoingRequests: state.outgoingRequests.filter((r) => r.userId !== friend.id),
        };
      }),

      removeFriendFromList: (friendId) => set((state) => ({
        friends: state.friends.filter((f) => f.id !== friendId),
      })),

      addBlockedUser: (user) => set((state) => {
        // Don't add if already exists
        if (state.blockedUsers.some((u) => u.id === user.id)) {
          return state;
        }
        // Remove from friends and requests if present
        return {
          blockedUsers: [...state.blockedUsers, user],
          friends: state.friends.filter((f) => f.id !== user.id),
          incomingRequests: state.incomingRequests.filter((r) => r.userId !== user.id),
          outgoingRequests: state.outgoingRequests.filter((r) => r.userId !== user.id),
        };
      }),

      removeBlockedUserFromList: (userId) => set((state) => ({
        blockedUsers: state.blockedUsers.filter((u) => u.id !== userId),
      })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'freedomtalk-friends',
      partialize: (state) => ({
        // Don't persist friend data - fetch fresh on load
      }),
    }
  )
);
