import { create } from 'zustand';
import type { VoiceUser } from '@/types';

interface VoiceStore {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  currentChannelId: string | null;
  currentServerId: string | null;
  sessionId: string | null;
  error: string | null;

  // Self state
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;

  // Local streams
  localAudioStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  localScreenStream: MediaStream | null;

  // Users in channel
  users: VoiceUser[];

  // Channel states (for showing who's in which channel)
  channelStates: Record<string, VoiceUser[]>;

  // Selected devices
  audioInput: string | null;
  audioOutput: string | null;
  videoInput: string | null;

  // Last text channel (for redirect after leaving voice)
  lastTextChannelId: string | null;
  lastTextChannelServerId: string | null;

  // Actions
  setConnected: (connected: boolean, channelId?: string, serverId?: string, sessionId?: string) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;

  setSelfMute: (mute: boolean) => void;
  setSelfDeaf: (deaf: boolean) => void;
  setSelfVideo: (video: boolean) => void;
  setSelfStream: (stream: boolean) => void;

  setLocalAudioStream: (stream: MediaStream | null) => void;
  setLocalVideoStream: (stream: MediaStream | null) => void;
  setLocalScreenStream: (stream: MediaStream | null) => void;

  setUsers: (users: VoiceUser[]) => void;
  addUser: (user: VoiceUser) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<VoiceUser>) => void;
  updateUserStream: (userId: string, streamType: 'audio' | 'video' | 'screen', stream: MediaStream | null) => void;

  setAudioInput: (deviceId: string | null) => void;
  setAudioOutput: (deviceId: string | null) => void;
  setVideoInput: (deviceId: string | null) => void;

  setLastTextChannel: (channelId: string | null, serverId: string | null) => void;

  getUsersByChannel: (channelId: string) => VoiceUser[];
  isUserInChannel: (userId: string, channelId: string) => boolean;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  // Connection state
  isConnected: false,
  isConnecting: false,
  currentChannelId: null,
  currentServerId: null,
  sessionId: null,
  error: null,

  // Self state
  selfMute: false,
  selfDeaf: false,
  selfVideo: false,
  selfStream: false,

  // Local streams
  localAudioStream: null,
  localVideoStream: null,
  localScreenStream: null,

  // Users
  users: [],
  channelStates: {},

  // Devices
  audioInput: null,
  audioOutput: null,
  videoInput: null,

  // Last text channel
  lastTextChannelId: null,
  lastTextChannelServerId: null,

  // Actions
  setConnected: (connected, channelId, serverId, sessionId) =>
    set({
      isConnected: connected,
      currentChannelId: channelId ?? null,
      currentServerId: serverId ?? null,
      sessionId: sessionId ?? null,
      isConnecting: false,
      error: null,
    }),

  setConnecting: (connecting) =>
    set({ isConnecting: connecting }),

  setError: (error) =>
    set({ error, isConnecting: false }),

  disconnect: () =>
    set({
      isConnected: false,
      currentChannelId: null,
      currentServerId: null,
      sessionId: null,
      users: [],
      localAudioStream: null,
      localVideoStream: null,
      localScreenStream: null,
      selfMute: false,
      selfDeaf: false,
      selfVideo: false,
      selfStream: false,
    }),

  setSelfMute: (mute) => set({ selfMute: mute }),
  setSelfDeaf: (deaf) => set({ selfDeaf: deaf }),
  setSelfVideo: (video) => set({ selfVideo: video }),
  setSelfStream: (stream) => set({ selfStream: stream }),

  setLocalAudioStream: (stream) => set({ localAudioStream: stream }),
  setLocalVideoStream: (stream) => set({ localVideoStream: stream }),
  setLocalScreenStream: (stream) => set({ localScreenStream: stream }),

  setUsers: (users) => set({ users }),

  addUser: (user) =>
    set((state) => ({ users: [...state.users, user] })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.userId !== userId),
    })),

  updateUser: (userId, updates) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.userId === userId ? { ...u, ...updates } : u
      ),
    })),

  updateUserStream: (userId, streamType, stream) =>
    set((state) => ({
      users: state.users.map((u) => {
        if (u.userId !== userId) return u;
        return {
          ...u,
          audioStream: streamType === 'audio' ? stream ?? undefined : u.audioStream,
          videoStream: streamType === 'video' ? stream ?? undefined : u.videoStream,
          screenStream: streamType === 'screen' ? stream ?? undefined : u.screenStream,
        };
      }),
    })),

  setAudioInput: (deviceId) => set({ audioInput: deviceId }),
  setAudioOutput: (deviceId) => set({ audioOutput: deviceId }),
  setVideoInput: (deviceId) => set({ videoInput: deviceId }),

  setLastTextChannel: (channelId, serverId) =>
    set({
      lastTextChannelId: channelId,
      lastTextChannelServerId: serverId,
    }),

  getUsersByChannel: (channelId) =>
    get().users.filter((u) => u.channelId === channelId),

  isUserInChannel: (userId, channelId) =>
    get().users.some((u) => u.userId === userId && u.channelId === channelId),
}));
