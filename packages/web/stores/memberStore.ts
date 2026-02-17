import { create } from 'zustand';
import { apiClient, type MemberResponse } from '@/lib/api-client';

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  status: UserStatus;
  customStatus?: string;
  roles: string[];
  joinedAt: string;
  isOwner: boolean;
  isOnline: boolean;
}

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string;
  position: number;
  permissions: bigint;
  hoist: boolean;
  mentionable: boolean;
  icon?: string;
}

interface MemberState {
  members: Record<string, ServerMember[]>; // serverId -> members
  roles: Record<string, Role[]>; // serverId -> roles
  onlineMembers: Record<string, string[]>; // serverId -> userIds
  loading: Record<string, boolean>; // serverId -> loading state
  error: string | null;

  // Actions
  fetchMembers: (serverId: string) => Promise<void>;
  setMembers: (serverId: string, members: ServerMember[]) => void;
  addMember: (serverId: string, member: ServerMember) => void;
  removeMember: (serverId: string, userId: string) => void;
  updateMember: (serverId: string, userId: string, updates: Partial<ServerMember>) => void;
  updateMemberStatus: (serverId: string, userId: string, status: UserStatus) => void;

  // Roles
  setRoles: (serverId: string, roles: Role[]) => void;
  addRole: (serverId: string, role: Role) => void;
  updateRole: (serverId: string, roleId: string, updates: Partial<Role>) => void;
  removeRole: (serverId: string, roleId: string) => void;

  // Helpers
  getMembersByServer: (serverId: string) => ServerMember[];
  getOnlineMembers: (serverId: string) => ServerMember[];
  getMembersByRole: (serverId: string, roleId: string) => ServerMember[];
  clearError: () => void;
}

// Convert API response to local type
function mapMemberResponse(response: MemberResponse): ServerMember {
  return {
    id: response.id,
    serverId: response.serverId,
    userId: response.userId,
    username: response.username,
    displayName: response.displayName,
    avatar: response.avatar,
    banner: response.banner,
    bio: response.bio,
    status: (response.status as UserStatus) || 'offline',
    customStatus: response.customStatus,
    roles: response.roles || [],
    joinedAt: response.joinedAt,
    isOwner: response.isOwner,
    isOnline: response.isOnline ?? (response.status === 'online'),
  };
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: {},
  roles: {},
  onlineMembers: {},
  loading: {},
  error: null,

  fetchMembers: async (serverId: string) => {
    set((state) => ({
      loading: { ...state.loading, [serverId]: true },
      error: null
    }));

    const response = await apiClient.getServerMembers(serverId);

    if (response.success && response.data) {
      // Handle both array response and { members: [] } format
      let membersArray: MemberResponse[];
      if (Array.isArray(response.data)) {
        membersArray = response.data as MemberResponse[];
      } else if (response.data.members) {
        membersArray = response.data.members as MemberResponse[];
      } else {
        membersArray = [];
      }

      const members = membersArray.map(mapMemberResponse);
      set({
        members: { ...get().members, [serverId]: members },
        onlineMembers: {
          ...get().onlineMembers,
          [serverId]: members.filter((m) => m.isOnline).map((m) => m.userId),
        },
        loading: { ...get().loading, [serverId]: false },
      });
    } else {
      set({
        error: response.error?.message || 'Failed to fetch members',
        loading: { ...get().loading, [serverId]: false },
      });
    }
  },

  setMembers: (serverId, members) => set((state) => ({
    members: { ...state.members, [serverId]: members },
    onlineMembers: {
      ...state.onlineMembers,
      [serverId]: members.filter((m) => m.isOnline).map((m) => m.userId),
    },
  })),

  addMember: (serverId, member) => set((state) => ({
    members: {
      ...state.members,
      [serverId]: [...(state.members[serverId] || []), member],
    },
  })),

  removeMember: (serverId, userId) => set((state) => ({
    members: {
      ...state.members,
      [serverId]: (state.members[serverId] || []).filter((m) => m.userId !== userId),
    },
  })),

  updateMember: (serverId, userId, updates) => set((state) => ({
    members: {
      ...state.members,
      [serverId]: (state.members[serverId] || []).map((m) =>
        m.userId === userId ? { ...m, ...updates } : m
      ),
    },
  })),

  updateMemberStatus: (serverId, userId, status) => {
    const isOnline = status !== 'offline';
    set((state) => ({
      members: {
        ...state.members,
        [serverId]: (state.members[serverId] || []).map((m) =>
          m.userId === userId ? { ...m, status, isOnline } : m
        ),
      },
      onlineMembers: {
        ...state.onlineMembers,
        [serverId]: isOnline
          ? [...new Set([...(state.onlineMembers[serverId] || []), userId])]
          : (state.onlineMembers[serverId] || []).filter((id) => id !== userId),
      },
    }));
  },

  setRoles: (serverId, roles) => set((state) => ({
    roles: { ...state.roles, [serverId]: roles },
  })),

  addRole: (serverId, role) => set((state) => ({
    roles: { ...state.roles, [serverId]: [...(state.roles[serverId] || []), role] },
  })),

  updateRole: (serverId, roleId, updates) => set((state) => ({
    roles: {
      ...state.roles,
      [serverId]: (state.roles[serverId] || []).map((r) =>
        r.id === roleId ? { ...r, ...updates } : r
      ),
    },
  })),

  removeRole: (serverId, roleId) => set((state) => ({
    roles: {
      ...state.roles,
      [serverId]: (state.roles[serverId] || []).filter((r) => r.id !== roleId),
    },
  })),

  getMembersByServer: (serverId) => {
    return get().members[serverId] || [];
  },

  getOnlineMembers: (serverId) => {
    const members = get().getMembersByServer(serverId);
    return members.filter((m) => m.isOnline);
  },

  getMembersByRole: (serverId, roleId) => {
    const members = get().getMembersByServer(serverId);
    return members.filter((m) => m.roles.includes(roleId));
  },

  clearError: () => set({ error: null }),
}));
