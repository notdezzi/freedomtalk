import { create } from 'zustand';

// Match the TypingUser type from types/index.ts
export interface TypingUser {
  userId: string;
  username: string;
  avatar?: string;
  startedAt: number;
}

interface TypingState {
  // Map of channelId -> array of typing users
  typingUsers: Map<string, TypingUser[]>;

  // Actions
  setTyping: (channelId: string, userId: string, username: string, isTyping: boolean, avatar?: string) => void;
  getTypingUsers: (channelId: string) => TypingUser[];
  clearChannel: (channelId: string) => void;
  clearAll: () => void;
}

// Auto-remove typing indicator after 5 seconds of no updates
const TYPING_TIMEOUT = 5000;

export const useTypingStore = create<TypingState>((set, get) => ({
  typingUsers: new Map(),

  setTyping: (channelId, userId, username, isTyping, avatar) => {
    set((state) => {
      const newMap = new Map(state.typingUsers);
      const channelTyping = newMap.get(channelId) || [];

      if (isTyping) {
        // Add or update typing user
        const existingIndex = channelTyping.findIndex((u) => u.userId === userId);
        const typingUser: TypingUser = {
          userId,
          username,
          avatar,
          startedAt: Date.now(),
        };

        if (existingIndex >= 0) {
          channelTyping[existingIndex] = typingUser;
        } else {
          channelTyping.push(typingUser);
        }
        newMap.set(channelId, channelTyping);
      } else {
        // Remove typing user
        const filtered = channelTyping.filter((u) => u.userId !== userId);
        if (filtered.length > 0) {
          newMap.set(channelId, filtered);
        } else {
          newMap.delete(channelId);
        }
      }

      return { typingUsers: newMap };
    });
  },

  getTypingUsers: (channelId) => {
    return get().typingUsers.get(channelId) || [];
  },

  clearChannel: (channelId) => {
    set((state) => {
      const newMap = new Map(state.typingUsers);
      newMap.delete(channelId);
      return { typingUsers: newMap };
    });
  },

  clearAll: () => {
    set({ typingUsers: new Map() });
  },
}));

// Hook to get typing users for a specific channel with auto-refresh
export function useTypingUsers(channelId: string): TypingUser[] {
  return useTypingStore((state) => state.typingUsers.get(channelId) || []);
}
