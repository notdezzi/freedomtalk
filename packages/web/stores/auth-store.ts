import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface Session {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface AuthStore {
  user: User | null;
  sessions: Session[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboardingComplete: boolean;
  setUser: (user: User | null) => void;
  setSessions: (sessions: Session[]) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      sessions: [],
      isAuthenticated: false,
      isLoading: true,
      isOnboardingComplete: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setSessions: (sessions) =>
        set({ sessions }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setOnboardingComplete: (complete) =>
        set({ isOnboardingComplete: complete }),

      logout: () =>
        set({
          user: null,
          sessions: [],
          isAuthenticated: false,
          isLoading: false,
        }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'freedomtalk-auth',
      partialize: (state) => ({
        user: state.user,
        // Don't persist isAuthenticated - it must be verified by server
        // isAuthenticated: state.isAuthenticated,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
);
