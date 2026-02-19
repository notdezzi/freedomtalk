import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, type DMChannelResponse } from '@/lib/api-client';
import { useAuthStore } from './authStore';

export interface DMChannel {
  id: string;
  type: 'dm' | 'group_dm';
  name?: string;
  iconUrl?: string;
  ownerId?: string;
  recipients: DMRecipient[];
  lastMessageId?: string;
  lastMessageAt?: string;
  createdAt: string;
  isMuted?: boolean;
  unreadCount?: number;
}

export interface DMRecipient {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

interface DMState {
  channels: DMChannel[];
  currentChannelId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchChannels: () => Promise<void>;
  addChannel: (channel: DMChannel) => void;
  updateChannel: (channelId: string, updates: Partial<DMChannel>) => void;
  updateChannelMuted: (channelId: string, isMuted: boolean) => void;
  removeChannel: (channelId: string) => void;
  setCurrentChannel: (channelId: string | null) => void;

  // Helpers
  getChannel: (channelId: string) => DMChannel | undefined;
  getDMWithUser: (userId: string) => DMChannel | undefined;
  getChannelName: (channel: DMChannel) => string;
  getChannelIcon: (channel: DMChannel) => string | undefined;
  clearError: () => void;
}

// Convert API response to local type
function mapDMChannelResponse(response: DMChannelResponse): DMChannel {
  return {
    id: response.id,
    type: response.type as 'dm' | 'group_dm',
    name: response.name,
    iconUrl: response.iconUrl,
    ownerId: response.ownerId,
    recipients: (response.recipients || []).map((r) => ({
      id: r.id,
      username: r.username || 'Unknown User',
      displayName: r.displayName || undefined,
      avatar: r.avatar || undefined,
    })),
    lastMessageId: response.lastMessageId,
    lastMessageAt: response.lastMessageAt,
    createdAt: response.createdAt,
  };
}

// Track in-flight request to prevent duplicate DM channel fetches
let dmChannelsFetchPromise: Promise<void> | null = null;

export const useDMStore = create<DMState>()(
  persist(
    (set, get) => ({
      channels: [],
      currentChannelId: null,
      loading: false,
      error: null,

      fetchChannels: async () => {
        // If already fetching, return existing promise
        if (dmChannelsFetchPromise) {
          return dmChannelsFetchPromise;
        }

        // If we already have channels, don't fetch again
        if (get().channels.length > 0) {
          return;
        }

        set({ loading: true, error: null });

        dmChannelsFetchPromise = (async () => {
          try {
            const response = await apiClient.getDMChannels();

            if (response.success && response.data) {
              const channels = response.data.dmChannels.map(mapDMChannelResponse);
              // Sort by last message time (most recent first)
              channels.sort((a, b) => {
                if (!a.lastMessageAt) return 1;
                if (!b.lastMessageAt) return -1;
                return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
              });

              set({ channels, loading: false });
            } else {
              set({
                error: response.error?.message || 'Failed to fetch DM channels',
                loading: false,
              });
            }
          } finally {
            dmChannelsFetchPromise = null;
          }
        })();

        return dmChannelsFetchPromise;
      },

      addChannel: (channel) => set((state) => ({
        channels: [channel, ...state.channels.filter((c) => c.id !== channel.id)],
      })),

      updateChannel: (channelId, updates) => set((state) => ({
        channels: state.channels.map((c) =>
          c.id === channelId ? { ...c, ...updates } : c
        ),
      })),

      updateChannelMuted: (channelId, isMuted) => set((state) => ({
        channels: state.channels.map((c) =>
          c.id === channelId ? { ...c, isMuted } : c
        ),
      })),

      removeChannel: (channelId) => set((state) => ({
        channels: state.channels.filter((c) => c.id !== channelId),
        currentChannelId: state.currentChannelId === channelId ? null : state.currentChannelId,
      })),

      setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),

      getChannel: (channelId) => {
        return get().channels.find((c) => c.id === channelId);
      },

      getDMWithUser: (userId) => {
        return get().channels.find(
          (c) => c.type === 'dm' && c.recipients.some((r) => r.id === userId)
        );
      },

      getChannelName: (channel) => {
        if (channel.type === 'group_dm' && channel.name) {
          return channel.name;
        }

        // For DMs, show the other user's name
        // Get current user ID from auth store
        const currentUserId = useAuthStore.getState().user?.id;

        // If we have recipients, find the other one
        if (channel.recipients && channel.recipients.length > 0) {
          const otherRecipient = currentUserId
            ? channel.recipients.find((r) => r.id !== currentUserId)
            : channel.recipients[0];

          if (otherRecipient) {
            return otherRecipient.displayName || otherRecipient.username || 'Unknown User';
          }
        }

        return 'Unknown User';
      },

      getChannelIcon: (channel) => {
        if (channel.type === 'group_dm' && channel.iconUrl) {
          return channel.iconUrl;
        }

        // For DMs, show the other user's avatar
        // Get current user ID from auth store
        const currentUserId = useAuthStore.getState().user?.id;

        if (channel.recipients && channel.recipients.length > 0) {
          const otherRecipient = currentUserId
            ? channel.recipients.find((r) => r.id !== currentUserId)
            : channel.recipients[0];

          return otherRecipient?.avatar;
        }

        return undefined;
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'freedomtalk-dms',
      partialize: (state) => ({
        currentChannelId: state.currentChannelId,
      }),
    }
  )
);
