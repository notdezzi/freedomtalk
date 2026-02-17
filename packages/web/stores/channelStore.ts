import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, type ChannelResponse, type CategoryResponse } from '@/lib/api-client';

export type ChannelType = 'text' | 'voice' | 'announcement' | 'category';

export interface Channel {
  id: string;
  serverId: string;
  categoryId: string | null;
  name: string;
  type: ChannelType;
  topic?: string;
  position: number;
  nsfw: boolean;
  rateLimitPerUser: number;
  bitrate?: number;
  userLimit?: number;
  unreadCount?: number;
  hasNotification?: boolean;
  lastMessageId?: string;
}

export interface Category {
  id: string;
  serverId: string;
  name: string;
  position: number;
  isCollapsed: boolean;
  channels: string[]; // Channel IDs in order
}

interface ChannelState {
  channels: Record<string, Channel>; // channelId -> Channel
  categories: Record<string, Category>; // categoryId -> Category
  currentChannelId: string | null;
  serverChannels: Record<string, string[]>; // serverId -> channelIds
  loading: Record<string, boolean>; // serverId -> loading state
  error: string | null;

  // Actions
  fetchChannels: (serverId: string) => Promise<void>;
  setChannels: (serverId: string, channels: Channel[], categories: Category[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;
  setCurrentChannel: (channelId: string | null) => void;
  setChannelUnread: (channelId: string, count: number) => void;
  clearChannelUnread: (channelId: string) => void;

  // Categories
  toggleCategoryCollapse: (categoryId: string) => void;
  reorderChannels: (categoryId: string, channelIds: string[]) => void;

  // Helpers
  getChannelsByServer: (serverId: string) => { channels: Channel[]; categories: Category[] };
  getChannelsByCategory: (categoryId: string | null) => Channel[];
  getChannel: (channelId: string) => Channel | undefined;
  clearError: () => void;
}

// Convert API responses to local types
function mapChannelResponse(response: ChannelResponse): Channel {
  return {
    id: response.id,
    serverId: response.serverId,
    categoryId: response.categoryId || null,
    name: response.name,
    type: response.type as ChannelType,
    topic: response.topic,
    position: response.position,
    nsfw: response.nsfw,
    rateLimitPerUser: response.rateLimitPerUser,
    bitrate: response.bitrate,
    userLimit: response.userLimit,
  };
}

function mapCategoryResponse(response: CategoryResponse, channels: Channel[]): Category {
  const categoryChannels = channels
    .filter((ch) => ch.categoryId === response.id)
    .sort((a, b) => a.position - b.position)
    .map((ch) => ch.id);

  return {
    id: response.id,
    serverId: response.serverId,
    name: response.name,
    position: response.position,
    isCollapsed: false,
    channels: categoryChannels,
  };
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set, get) => ({
      channels: {},
      categories: {},
      currentChannelId: null,
      serverChannels: {},
      loading: {},
      error: null,

      fetchChannels: async (serverId: string) => {
        set((state) => ({
          loading: { ...state.loading, [serverId]: true },
          error: null
        }));

        const response = await apiClient.getChannels(serverId);

        if (response.success && response.data) {
          // Handle both array response and { channels: [], categories: [] } format
          let channelsArray: ChannelResponse[];
          let categoriesArray: CategoryResponse[] = [];

          if (Array.isArray(response.data)) {
            // API returned array directly
            channelsArray = response.data as ChannelResponse[];
          } else if (response.data.channels) {
            // API returned { channels: [], categories: [] }
            channelsArray = response.data.channels as ChannelResponse[];
            categoriesArray = (response.data.categories || []) as CategoryResponse[];
          } else {
            channelsArray = [];
          }

          const channels = channelsArray.map(mapChannelResponse);
          const categories = categoriesArray.map((cat) =>
            mapCategoryResponse(cat, channels)
          );

          const channelMap = { ...get().channels };
          const categoryMap = { ...get().categories };

          channels.forEach((ch) => {
            channelMap[ch.id] = ch;
          });

          categories.forEach((cat) => {
            categoryMap[cat.id] = cat;
          });

          set({
            channels: channelMap,
            categories: categoryMap,
            serverChannels: {
              ...get().serverChannels,
              [serverId]: channels.map((ch) => ch.id),
            },
            loading: { ...get().loading, [serverId]: false },
          });
        } else {
          set({
            error: response.error?.message || 'Failed to fetch channels',
            loading: { ...get().loading, [serverId]: false },
          });
        }
      },

      setChannels: (serverId, channels, categories) => {
        const channelMap = { ...get().channels };
        const categoryMap = { ...get().categories };

        channels.forEach((ch) => {
          channelMap[ch.id] = ch;
        });

        categories.forEach((cat) => {
          categoryMap[cat.id] = cat;
        });

        set({
          channels: channelMap,
          categories: categoryMap,
          serverChannels: {
            ...get().serverChannels,
            [serverId]: channels.map((ch) => ch.id),
          },
        });
      },

      addChannel: (channel) => set((state) => ({
        channels: { ...state.channels, [channel.id]: channel },
      })),

      updateChannel: (channelId, updates) => set((state) => ({
        channels: {
          ...state.channels,
          [channelId]: state.channels[channelId]
            ? { ...state.channels[channelId], ...updates }
            : state.channels[channelId],
        },
      })),

      removeChannel: (channelId) => set((state) => {
        const { [channelId]: removed, ...rest } = state.channels;
        return {
          channels: rest,
          currentChannelId: state.currentChannelId === channelId ? null : state.currentChannelId,
        };
      }),

      setCurrentChannel: (currentChannelId) => set({ currentChannelId }),

      setChannelUnread: (channelId, count) => set((state) => ({
        channels: {
          ...state.channels,
          [channelId]: state.channels[channelId]
            ? { ...state.channels[channelId], unreadCount: count }
            : state.channels[channelId],
        },
      })),

      clearChannelUnread: (channelId) => set((state) => ({
        channels: {
          ...state.channels,
          [channelId]: state.channels[channelId]
            ? { ...state.channels[channelId], unreadCount: 0, hasNotification: false }
            : state.channels[channelId],
        },
      })),

      toggleCategoryCollapse: (categoryId) => set((state) => ({
        categories: {
          ...state.categories,
          [categoryId]: state.categories[categoryId]
            ? { ...state.categories[categoryId], isCollapsed: !state.categories[categoryId].isCollapsed }
            : state.categories[categoryId],
        },
      })),

      reorderChannels: (categoryId, channelIds) => set((state) => ({
        categories: {
          ...state.categories,
          [categoryId]: state.categories[categoryId]
            ? { ...state.categories[categoryId], channels: channelIds }
            : state.categories[categoryId],
        },
      })),

      getChannelsByServer: (serverId) => {
        const state = get();
        const channelIds = state.serverChannels[serverId] || [];

        const channels = channelIds
          .map((id) => state.channels[id])
          .filter((ch): ch is Channel => ch !== undefined);

        const categories = Object.values(state.categories)
          .filter((cat) => cat.serverId === serverId)
          .sort((a, b) => a.position - b.position);

        return { channels, categories };
      },

      getChannelsByCategory: (categoryId) => {
        const state = get();
        return Object.values(state.channels)
          .filter((ch) => ch.categoryId === categoryId)
          .sort((a, b) => a.position - b.position);
      },

      getChannel: (channelId) => {
        return get().channels[channelId];
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'freedomtalk-channels',
      partialize: (state) => ({
        currentChannelId: state.currentChannelId,
      }),
    }
  )
);
