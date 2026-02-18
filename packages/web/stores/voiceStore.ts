import { create } from 'zustand';

export interface VoiceUser {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  channelId: string;
  sessionId: string;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;
  suppress: boolean;
  isSpeaking: boolean;
}

export interface VoiceChannel {
  channelId: string;
  serverId: string;
  users: VoiceUser[];
}

interface VoiceState {
  // Current voice state
  isConnected: boolean;
  currentChannelId: string | null;
  currentServerId: string | null;
  sessionId: string | null;

  // Self state
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;

  // Users in current channel
  users: VoiceUser[];

  // Channel states for sidebar display
  channelStates: Record<string, VoiceUser[]>; // channelId -> users

  // Media devices
  audioInput: string | null;
  audioOutput: string | null;
  videoInput: string | null;

  // Loading states
  isConnecting: boolean;
  error: string | null;

  // Actions
  connectToChannel: (channelId: string, serverId: string, sessionId: string) => void;
  disconnectFromChannel: () => void;
  setSelfMute: (mute: boolean) => void;
  setSelfDeaf: (deaf: boolean) => void;
  setSelfVideo: (video: boolean) => void;
  setSelfStream: (stream: boolean) => void;

  // User management
  setUsers: (channelId: string, users: VoiceUser[]) => void;
  addUser: (channelId: string, user: VoiceUser) => void;
  removeUser: (channelId: string, userId: string) => void;
  updateUser: (channelId: string, userId: string, updates: Partial<VoiceUser>) => void;

  // Device management
  setAudioInput: (deviceId: string | null) => void;
  setAudioOutput: (deviceId: string | null) => void;
  setVideoInput: (deviceId: string | null) => void;

  // Helpers
  getUsersByChannel: (channelId: string) => VoiceUser[];
  isUserInChannel: (channelId: string, userId: string) => boolean;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isConnected: false,
  currentChannelId: null,
  currentServerId: null,
  sessionId: null,
  selfMute: false,
  selfDeaf: false,
  selfVideo: false,
  selfStream: false,
  users: [],
  channelStates: {},
  audioInput: null,
  audioOutput: null,
  videoInput: null,
  isConnecting: false,
  error: null,

  connectToChannel: (channelId, serverId, sessionId) =>
    set({
      isConnected: true,
      currentChannelId: channelId,
      currentServerId: serverId,
      sessionId,
      isConnecting: false,
    }),

  disconnectFromChannel: () =>
    set((state) => {
      // Remove self from channel states
      const newChannelStates = { ...state.channelStates };
      if (state.currentChannelId) {
        newChannelStates[state.currentChannelId] = (
          newChannelStates[state.currentChannelId] || []
        ).filter((u) => u.sessionId !== state.sessionId);
      }

      return {
        isConnected: false,
        currentChannelId: null,
        currentServerId: null,
        sessionId: null,
        selfMute: false,
        selfDeaf: false,
        selfVideo: false,
        selfStream: false,
        users: [],
        channelStates: newChannelStates,
      };
    }),

  setSelfMute: (mute) => {
    set({ selfMute: mute });
    // Also update the user in the channel states
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfMute: mute });
    }
  },
  setSelfDeaf: (deaf) => {
    // When deafened, also mute
    const newMute = deaf ? true : get().selfMute;
    set({ selfDeaf: deaf, selfMute: newMute });
    // Also update the user in the channel states
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfDeaf: deaf, selfMute: newMute });
    }
  },
  setSelfVideo: (video) => {
    set({ selfVideo: video });
    // Also update the user in the channel states
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfVideo: video });
    }
  },
  setSelfStream: (stream) => {
    set({ selfStream: stream });
    // Also update the user in the channel states
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfStream: stream });
    }
  },

  setUsers: (channelId, users) =>
    set((state) => ({
      channelStates: {
        ...state.channelStates,
        [channelId]: users,
      },
      // Update current channel users if this is the current channel
      users: state.currentChannelId === channelId ? users : state.users,
    })),

  addUser: (channelId, user) =>
    set((state) => {
      const channelUsers = state.channelStates[channelId] || [];
      const newUsers = [...channelUsers, user];

      return {
        channelStates: {
          ...state.channelStates,
          [channelId]: newUsers,
        },
        users: state.currentChannelId === channelId ? newUsers : state.users,
      };
    }),

  removeUser: (channelId, userId) =>
    set((state) => {
      const channelUsers = state.channelStates[channelId] || [];
      const newUsers = channelUsers.filter((u) => u.userId !== userId);

      return {
        channelStates: {
          ...state.channelStates,
          [channelId]: newUsers,
        },
        users: state.currentChannelId === channelId ? newUsers : state.users,
      };
    }),

  updateUser: (channelId, userId, updates) =>
    set((state) => {
      const channelUsers = state.channelStates[channelId] || [];
      const newUsers = channelUsers.map((u) =>
        u.userId === userId || u.sessionId === userId ? { ...u, ...updates } : u
      );

      return {
        channelStates: {
          ...state.channelStates,
          [channelId]: newUsers,
        },
        users: state.currentChannelId === channelId ? newUsers : state.users,
      };
    }),

  setAudioInput: (deviceId) => set({ audioInput: deviceId }),
  setAudioOutput: (deviceId) => set({ audioOutput: deviceId }),
  setVideoInput: (deviceId) => set({ videoInput: deviceId }),

  getUsersByChannel: (channelId) => {
    return get().channelStates[channelId] || [];
  },

  isUserInChannel: (channelId, userId) => {
    const users = get().channelStates[channelId] || [];
    return users.some((u) => u.userId === userId);
  },

  setError: (error) => set({ error, isConnecting: false }),
  clearError: () => set({ error: null }),
}));
