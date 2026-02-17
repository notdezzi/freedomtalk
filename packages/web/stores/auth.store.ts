import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";
import api from "@/lib/api";

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<LoginResponse>("/auth/login", {
            email,
            password,
          });
          // Store tokens for authenticated requests
          if (response.accessToken && response.refreshToken) {
            api.setTokens(response.accessToken, response.refreshToken);
          }
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<LoginResponse>("/auth/register", {
            username,
            email,
            password,
          });
          // Store tokens for authenticated requests
          if (response.accessToken && response.refreshToken) {
            api.setTokens(response.accessToken, response.refreshToken);
          }
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post("/auth/logout", {});
        } catch {
          // Ignore logout errors
        } finally {
          // Clear stored tokens
          api.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      fetchUser: async () => {
        // Don't fetch if no tokens
        if (!api.hasTokens()) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await api.get<User>("/users/@me");
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Check auth status on app load
      checkAuth: async () => {
        if (!api.hasTokens()) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }
        await get().fetchUser();
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...updates },
          });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
