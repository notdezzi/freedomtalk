import { create } from 'zustand';
import type { Socket } from 'socket.io-client';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

interface QueuedMessage {
  id: string;
  event: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

interface SocketStore {
  socket: Socket | null;
  status: ConnectionStatus;
  error: string | null;
  reconnectAttempts: number;
  lastConnected: Date | null;
  queuedMessages: QueuedMessage[];
  subscriptions: Set<string>;

  setSocket: (socket: Socket | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setReconnectAttempts: (attempts: number) => void;
  setLastConnected: (date: Date | null) => void;

  queueMessage: (event: string, data: unknown) => void;
  removeQueuedMessage: (id: string) => void;
  clearQueue: () => void;

  subscribe: (roomId: string) => void;
  unsubscribe: (roomId: string) => void;
  isSubscribed: (roomId: string) => boolean;
  clearSubscriptions: () => void;

  reset: () => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  status: 'disconnected',
  error: null,
  reconnectAttempts: 0,
  lastConnected: null,
  queuedMessages: [],
  subscriptions: new Set(),

  setSocket: (socket) => set({ socket }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
  setLastConnected: (date) => set({ lastConnected: date }),

  queueMessage: (event, data) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      queuedMessages: [
        ...state.queuedMessages,
        { id, event, data, timestamp: Date.now(), retries: 0 },
      ],
    }));
  },

  removeQueuedMessage: (id) =>
    set((state) => ({
      queuedMessages: state.queuedMessages.filter((m) => m.id !== id),
    })),

  clearQueue: () => set({ queuedMessages: [] }),

  subscribe: (roomId) => {
    set((state) => ({
      subscriptions: new Set(state.subscriptions).add(roomId),
    }));
  },

  unsubscribe: (roomId) => {
    set((state) => {
      const newSubs = new Set(state.subscriptions);
      newSubs.delete(roomId);
      return { subscriptions: newSubs };
    });
  },

  isSubscribed: (roomId) => get().subscriptions.has(roomId),

  clearSubscriptions: () => set({ subscriptions: new Set() }),

  reset: () =>
    set({
      socket: null,
      status: 'disconnected',
      error: null,
      reconnectAttempts: 0,
      lastConnected: null,
      queuedMessages: [],
      subscriptions: new Set(),
    }),
}));
