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
  // Remote streams for this user
  audioStream?: MediaStream;
  videoStream?: MediaStream;
  screenStream?: MediaStream;
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

  // Last text channel for redirect on disconnect
  lastTextChannelId: string | null;
  lastTextChannelServerId: string | null;

  // Self state
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;

  // Local streams (what we're producing)
  localAudioStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  localScreenStream: MediaStream | null;

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

  // Local stream management
  setLocalAudioStream: (stream: MediaStream | null) => void;
  setLocalVideoStream: (stream: MediaStream | null) => void;
  setLocalScreenStream: (stream: MediaStream | null) => void;

  // User management
  setUsers: (channelId: string, users: VoiceUser[]) => void;
  addUser: (channelId: string, user: VoiceUser) => void;
  removeUser: (channelId: string, sessionId: string) => void;
  updateUser: (channelId: string, sessionId: string, updates: Partial<VoiceUser>) => void;

  // Remote stream management
  updateUserStream: (sessionId: string, kind: 'audio' | 'video' | 'screen', stream: MediaStream | null) => void;
  clearUserStreams: (sessionId: string) => void;

  // Device management
  setAudioInput: (deviceId: string | null) => void;
  setAudioOutput: (deviceId: string | null) => void;
  setVideoInput: (deviceId: string | null) => void;

  // Helpers
  getUsersByChannel: (channelId: string) => VoiceUser[];
  isUserInChannel: (channelId: string, userId: string) => boolean;
  getUserBySessionId: (sessionId: string) => VoiceUser | undefined;

  // Last text channel tracking
  setLastTextChannel: (channelId: string | null, serverId: string | null) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isConnected: false,
  currentChannelId: null,
  currentServerId: null,
  sessionId: null,
  lastTextChannelId: null,
  lastTextChannelServerId: null,
  selfMute: false,
  selfDeaf: false,
  selfVideo: false,
  selfStream: false,
  localAudioStream: null,
  localVideoStream: null,
  localScreenStream: null,
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
        localAudioStream: null,
        localVideoStream: null,
        localScreenStream: null,
        users: [],
        channelStates: newChannelStates,
      };
    }),

  setSelfMute: (mute) => {
    set({ selfMute: mute });
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfMute: mute });
    }
  },
  setSelfDeaf: (deaf) => {
    const newMute = deaf ? true : get().selfMute;
    set({ selfDeaf: deaf, selfMute: newMute });
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfDeaf: deaf, selfMute: newMute });
    }
  },
  setSelfVideo: (video) => {
    set({ selfVideo: video });
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfVideo: video });
    }
  },
  setSelfStream: (stream) => {
    set({ selfStream: stream });
    const state = get();
    if (state.currentChannelId && state.sessionId) {
      state.updateUser(state.currentChannelId, state.sessionId, { selfStream: stream });
    }
  },

  setLocalAudioStream: (stream) => set({ localAudioStream: stream }),
  setLocalVideoStream: (stream) => set({ localVideoStream: stream }),
  setLocalScreenStream: (stream) => set({ localScreenStream: stream }),

  setUsers: (channelId, users) =>
    set((state) => ({
      channelStates: {
        ...state.channelStates,
        [channelId]: users,
      },
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

  removeUser: (channelId, sessionId) =>
    set((state) => {
      const channelUsers = state.channelStates[channelId] || [];
      const newUsers = channelUsers.filter((u) => u.sessionId !== sessionId);

      return {
        channelStates: {
          ...state.channelStates,
          [channelId]: newUsers,
        },
        users: state.currentChannelId === channelId ? newUsers : state.users,
      };
    }),

  updateUser: (channelId, sessionId, updates) =>
    set((state) => {
      const channelUsers = state.channelStates[channelId] || [];
      const newUsers = channelUsers.map((u) =>
        u.sessionId === sessionId ? { ...u, ...updates } : u
      );

      return {
        channelStates: {
          ...state.channelStates,
          [channelId]: newUsers,
        },
        users: state.currentChannelId === channelId ? newUsers : state.users,
      };
    }),

  updateUserStream: (sessionId, kind, stream) =>
    set((state) => {
      const channelId = state.currentChannelId;
      if (!channelId) return state;

      const channelUsers = state.channelStates[channelId] || [];
      const newUsers = channelUsers.map((u) => {
        if (u.sessionId === sessionId) {
          if (kind === 'audio') {
            return { ...u, audioStream: stream || undefined };
          } else if (kind === 'video') {
            return { ...u, videoStream: stream || undefined };
          } else if (kind === 'screen') {
            return { ...u, screenStream: stream || undefined };
          }
        }
        return u;
      });

      return {
        channelStates: {
          ...state.channelStates,
          [channelId]: newUsers,
        },
        users: newUsers,
      };
    }),

  clearUserStreams: (sessionId) =>
    set((state) => {
      const channelId = state.currentChannelId;
      if (!channelId) return state;

      const channelUsers = state.channelStates[channelId] || [];
      const newUsers = channelUsers.map((u) => {
        if (u.sessionId === sessionId) {
          return { ...u, audioStream: undefined, videoStream: undefined, screenStream: undefined };
        }
        return u;
      });

      return {
        channelStates: {
          ...state.channelStates,
          [channelId]: newUsers,
        },
        users: newUsers,
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

  getUserBySessionId: (sessionId) => {
    return get().users.find((u) => u.sessionId === sessionId);
  },

  setLastTextChannel: (channelId, serverId) =>
    set({ lastTextChannelId: channelId, lastTextChannelServerId: serverId }),

  setError: (error) => set({ error, isConnecting: false }),
  clearError: () => set({ error: null }),
}));
