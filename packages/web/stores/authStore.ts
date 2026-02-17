import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  displayName?: string;
  createdAt: string;
  isVerified: boolean;
  has2FA: boolean;
}

export interface Session {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

interface AuthState {
  user: User | null;
  sessions: Session[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboardingComplete: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSessions: (sessions: Session[]) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  removeSession: (sessionId: string) => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessions: [],
      isAuthenticated: false,
      isLoading: true,
      isOnboardingComplete: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setSessions: (sessions) => set({ sessions }),

      setLoading: (isLoading) => set({ isLoading }),

      setOnboardingComplete: (isOnboardingComplete) => set({ isOnboardingComplete }),

      login: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({
        user: null,
        sessions: [],
        isAuthenticated: false,
        isOnboardingComplete: false,
      }),

      removeSession: (sessionId) => set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
      })),

      updateProfile: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    {
      name: 'freedomtalk-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
);
