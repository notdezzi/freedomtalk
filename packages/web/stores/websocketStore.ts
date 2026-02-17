import { create } from 'zustand';
import { Socket } from 'socket.io-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface QueuedMessage {
  id: string;
  event: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

interface WebSocketState {
  socket: Socket | null;
  status: ConnectionStatus;
  error: string | null;
  reconnectAttempts: number;
  lastConnected: Date | null;
  queuedMessages: QueuedMessage[];
  subscriptions: Set<string>;

  // Actions
  setSocket: (socket: Socket | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setReconnectAttempts: (attempts: number) => void;
  setLastConnected: (date: Date | null) => void;

  // Queue management
  queueMessage: (event: string, data: unknown) => void;
  removeQueuedMessage: (id: string) => void;
  clearQueue: () => void;
  processQueue: () => QueuedMessage[];

  // Subscription management
  subscribe: (roomId: string) => void;
  unsubscribe: (roomId: string) => void;
  isSubscribed: (roomId: string) => boolean;
  clearSubscriptions: () => void;

  // Reset
  reset: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  status: 'disconnected',
  error: null,
  reconnectAttempts: 0,
  lastConnected: null,
  queuedMessages: [],
  subscriptions: new Set<string>(),

  setSocket: (socket) => set({ socket }),

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error }),

  setReconnectAttempts: (reconnectAttempts) => set({ reconnectAttempts }),

  setLastConnected: (lastConnected) => set({ lastConnected }),

  queueMessage: (event, data) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      queuedMessages: [
        ...state.queuedMessages,
        { id, event, data, timestamp: Date.now(), retries: 0 },
      ],
    }));
  },

  removeQueuedMessage: (id) => {
    set((state) => ({
      queuedMessages: state.queuedMessages.filter((msg) => msg.id !== id),
    }));
  },

  clearQueue: () => set({ queuedMessages: [] }),

  processQueue: () => {
    const { queuedMessages } = get();
    // Return messages that are older than 5 seconds and have less than 3 retries
    const now = Date.now();
    return queuedMessages.filter(
      (msg) => now - msg.timestamp > 5000 && msg.retries < 3
    );
  },

  subscribe: (roomId) => {
    set((state) => ({
      subscriptions: new Set([...state.subscriptions, roomId]),
    }));
  },

  unsubscribe: (roomId) => {
    set((state) => {
      const newSubscriptions = new Set(state.subscriptions);
      newSubscriptions.delete(roomId);
      return { subscriptions: newSubscriptions };
    });
  },

  isSubscribed: (roomId) => {
    return get().subscriptions.has(roomId);
  },

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
