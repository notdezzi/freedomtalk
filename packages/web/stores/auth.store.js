import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";
export const useAuthStore = create()(persist((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const response = await api.post("/auth/login", {
                email,
                password,
            });
            if (response.accessToken && response.refreshToken) {
                api.setTokens(response.accessToken, response.refreshToken);
            }
            set({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
            });
        }
        catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },
    register: async (username, email, password) => {
        set({ isLoading: true });
        try {
            const response = await api.post("/auth/register", {
                username,
                email,
                password,
            });
            if (response.accessToken && response.refreshToken) {
                api.setTokens(response.accessToken, response.refreshToken);
            }
            set({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
            });
        }
        catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },
    logout: async () => {
        try {
            await api.post("/auth/logout", {});
        }
        catch {
        }
        finally {
            api.clearTokens();
            set({
                user: null,
                isAuthenticated: false,
            });
        }
    },
    fetchUser: async () => {
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
            const user = await api.get("/users/@me");
            set({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        }
        catch {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },
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
    setUser: (user) => {
        set({
            user,
            isAuthenticated: !!user,
        });
    },
    updateUser: (updates) => {
        const { user } = get();
        if (user) {
            set({
                user: { ...user, ...updates },
            });
        }
    },
}), {
    name: "auth-storage",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
    }),
}));
//# sourceMappingURL=auth.store.js.map