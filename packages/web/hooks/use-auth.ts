import { useAuthStore } from '@/stores';
import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const response = await apiClient.login(email, password);
        if (response.success && response.data) {
          setUser(response.data.user);
          return { success: true, mfaRequired: false };
        }
        return { success: false, error: response.error || 'Login failed' };
      } catch (error) {
        return { success: false, error: 'Login failed' };
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        setLoading(true);
        const response = await apiClient.register(username, email, password);
        if (response.success) {
          return { success: true };
        }
        return { success: false, error: response.error || 'Registration failed' };
      } catch (error) {
        return { success: false, error: 'Registration failed' };
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const logoutUser = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      logout();
    }
  }, [logout]);

  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSession();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    loginWithEmail,
    register,
    logout: logoutUser,
    checkSession,
    updateProfile,
  };
}
