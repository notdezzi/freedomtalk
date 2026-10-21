import { create } from 'zustand';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

interface SocketStore {
  status: ConnectionStatus;
  error: string | null;
  reconnectAttempts: number;
  lastConnected: Date | null;
  subscriptions: Set<string>;

  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setReconnectAttempts: (attempts: number) => void;
  setLastConnected: (date: Date | null) => void;

  subscribe: (roomId: string) => void;
  unsubscribe: (roomId: string) => void;
  isSubscribed: (roomId: string) => boolean;
  clearSubscriptions: () => void;

  reset: () => void;
}

// The socket instance itself lives in lib/socket.ts (singleton); this store
// only mirrors connection metadata. The old offline-queue (`queuedMessages`)
// and `setSocket` were removed — nothing ever enqueued or called them.
export const useSocketStore = create<SocketStore>((set, get) => ({
  status: 'disconnected',
  error: null,
  reconnectAttempts: 0,
  lastConnected: null,
  subscriptions: new Set(),

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
  setLastConnected: (date) => set({ lastConnected: date }),

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
      status: 'disconnected',
      error: null,
      reconnectAttempts: 0,
      lastConnected: null,
      subscriptions: new Set(),
    }),
}));
