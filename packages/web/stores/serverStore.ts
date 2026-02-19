import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, type ServerResponse } from '@/lib/api-client';

export interface Server {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  onlineCount: number;
  createdAt: string;
  isOwner: boolean;
  unreadCount?: number;
  hasNotification?: boolean;
  muted?: boolean;
}

export interface ServerFolder {
  id: string;
  name: string;
  color: string;
  serverIds: string[];
  isCollapsed: boolean;
}

interface ServerState {
  servers: Server[];
  folders: ServerFolder[];
  currentServerId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchServers: () => Promise<void>;
  setServers: (servers: Server[]) => void;
  addServer: (server: Server) => void;
  removeServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<Server>) => void;
  setCurrentServer: (serverId: string | null) => void;
  setServerUnread: (serverId: string, count: number) => void;
  clearServerUnread: (serverId: string) => void;
  toggleServerMute: (serverId: string) => void;

  // Folders
  addFolder: (folder: ServerFolder) => void;
  removeFolder: (folderId: string) => void;
  updateFolder: (folderId: string, updates: Partial<ServerFolder>) => void;
  toggleFolderCollapse: (folderId: string) => void;

  // Reorder
  reorderServers: (serverIds: string[]) => void;
  moveServerToFolder: (serverId: string, folderId: string | null) => void;

  // Clear error
  clearError: () => void;
}

// Convert API response to local Server type
// API returns snake_case, frontend uses camelCase
function mapServerResponse(response: unknown): Server {
  const r = response as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? 'Unnamed Server'),
    icon: (r.icon || r.icon_url) as string | undefined,
    banner: (r.banner || r.banner_url) as string | undefined,
    description: r.description as string | undefined,
    ownerId: String(r.ownerId ?? r.owner_id ?? ''),
    memberCount: Number(r.memberCount ?? r.member_count ?? 0),
    onlineCount: Number(r.onlineCount ?? r.online_count ?? 0),
    createdAt: String(r.createdAt ?? r.created_at ?? ''),
    isOwner: Boolean(r.isOwner ?? r.is_owner ?? false),
  };
}

// Track in-flight requests to prevent duplicates
let serversFetchPromise: Promise<void> | null = null;

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      servers: [],
      folders: [],
      currentServerId: null,
      isLoading: false,
      error: null,

      fetchServers: async () => {
        // If already fetching, return existing promise
        if (serversFetchPromise) {
          return serversFetchPromise;
        }

        // If we already have servers, don't fetch again (unless explicitly refreshed)
        if (get().servers.length > 0) {
          return;
        }

        set({ isLoading: true, error: null });

        serversFetchPromise = (async () => {
          try {
            const response = await apiClient.getServers();

        if (response.success && response.data) {
          // Handle both array response and { servers: [] } format
          const serversArray = Array.isArray(response.data)
            ? response.data
            : (response.data as { servers?: unknown[] }).servers || [];

            const servers = serversArray.map(mapServerResponse);

            set({ servers, isLoading: false });
          } else {
            set({
              error: response.error?.message || 'Failed to fetch servers',
              isLoading: false
            });
          }
        } finally {
          serversFetchPromise = null;
        }
      })();

        return serversFetchPromise;
      },

      setServers: (servers) => set({ servers }),

      addServer: (server) => set((state) => ({
        servers: [...state.servers, server],
      })),

      removeServer: (serverId) => set((state) => ({
        servers: state.servers.filter((s) => s.id !== serverId),
        currentServerId: state.currentServerId === serverId ? null : state.currentServerId,
      })),

      updateServer: (serverId, updates) => set((state) => ({
        servers: state.servers.map((s) =>
          s.id === serverId ? { ...s, ...updates } : s
        ),
      })),

      setCurrentServer: (currentServerId) => set({ currentServerId }),

      setServerUnread: (serverId, count) => set((state) => ({
        servers: state.servers.map((s) =>
          s.id === serverId ? { ...s, unreadCount: count } : s
        ),
      })),

      clearServerUnread: (serverId) => set((state) => ({
        servers: state.servers.map((s) =>
          s.id === serverId ? { ...s, unreadCount: 0, hasNotification: false } : s
        ),
      })),

      toggleServerMute: (serverId) => set((state) => ({
        servers: state.servers.map((s) =>
          s.id === serverId ? { ...s, muted: !s.muted } : s
        ),
      })),

      addFolder: (folder) => set((state) => ({
        folders: [...state.folders, folder],
      })),

      removeFolder: (folderId) => set((state) => ({
        folders: state.folders.filter((f) => f.id !== folderId),
      })),

      updateFolder: (folderId, updates) => set((state) => ({
        folders: state.folders.map((f) =>
          f.id === folderId ? { ...f, ...updates } : f
        ),
      })),

      toggleFolderCollapse: (folderId) => set((state) => ({
        folders: state.folders.map((f) =>
          f.id === folderId ? { ...f, isCollapsed: !f.isCollapsed } : f
        ),
      })),

      reorderServers: (serverIds) => set((state) => {
        const serverMap = new Map(state.servers.map((s) => [s.id, s]));
        const reorderedServers = serverIds
          .map((id) => serverMap.get(id))
          .filter((s): s is Server => s !== undefined);
        return { servers: reorderedServers };
      }),

      moveServerToFolder: (serverId, folderId) => set((state) => ({
        folders: state.folders.map((f) => ({
          ...f,
          serverIds: folderId === f.id
            ? [...f.serverIds, serverId]
            : f.serverIds.filter((id) => id !== serverId),
        })),
      })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'freedomtalk-servers',
      partialize: (state) => ({
        servers: state.servers,
        folders: state.folders,
        currentServerId: state.currentServerId,
      }),
    }
  )
);
