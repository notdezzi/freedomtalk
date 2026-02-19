import { useAuthStore } from '@/stores';
import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

export interface Session {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const sessions = useAuthStore((s) => s.sessions);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isOnboardingComplete = useAuthStore((s) => s.isOnboardingComplete);
  const setUser = useAuthStore((s) => s.setUser);
  const setSessions = useAuthStore((s) => s.setSessions);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const response = await apiClient.login(email, password);
        if (response.success && response.data) {
          if (response.data.mfaRequired) {
            return {
              success: true,
              mfaRequired: true,
              sessionId: response.data.sessionId,
            };
          }
          setUser(response.data.user);
          return { success: true, mfaRequired: false };
        }
        return {
          success: false,
          error: typeof response.error === 'string' ? response.error : response.error?.message || 'Login failed',
        };
      } catch (error) {
        return { success: false, error: 'Login failed' };
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading]
  );

  const verifyMfa = useCallback(
    async (sessionId: string, code: string) => {
      try {
        setLoading(true);
        const response = await apiClient.verifyMfa(sessionId, code);
        if (response.success && response.data) {
          setUser(response.data.user);
          return { success: true };
        }
        return {
          success: false,
          error: typeof response.error === 'string' ? response.error : response.error?.message || 'MFA verification failed',
        };
      } catch (error) {
        return { success: false, error: 'MFA verification failed' };
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
        return {
          success: false,
          error: typeof response.error === 'string' ? response.error : response.error?.message || 'Registration failed',
        };
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
        setUser(response.data.user || response.data);
      } else {
        // Only log out on specific auth errors (401 Unauthorized, invalid token)
        // Don't log out on rate limiting or server errors
        const errorCode = response.error?.code;
        const shouldLogout = [
          'UNAUTHORIZED',
          'INVALID_TOKEN',
          'TOKEN_EXPIRED',
          'SESSION_EXPIRED',
          'SESSION_NOT_FOUND',
        ].includes(errorCode || '');

        if (shouldLogout) {
          setUser(null);
        }
        // For other errors (rate limit, server error), keep the user logged in
        // The existing session might still be valid
      }
    } catch (error) {
      // Network errors shouldn't log the user out
      // They might just have a temporary connection issue
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  const refreshSessions = useCallback(async () => {
    // Not implemented in API
    setSessions([]);
    return { success: true };
  }, [setSessions]);

  const logoutOtherSessions = useCallback(
    async (_keepSessionId: string) => {
      // Not implemented in API
      return { success: false, error: 'Not implemented' };
    },
    []
  );

  const terminateSession = useCallback(async (_sessionId: string) => {
    // Not implemented in API
    return { success: false, error: 'Not implemented' };
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      const response = await apiClient.completeOnboarding();
      if (response.success) {
        setOnboardingComplete(true);
        return { success: true };
      }
      return { success: false, error: 'Failed to complete onboarding' };
    } catch (error) {
      return { success: false, error: 'Failed to complete onboarding' };
    }
  }, [setOnboardingComplete]);

  return {
    user,
    sessions,
    isAuthenticated,
    isLoading,
    isOnboardingComplete,
    loginWithEmail,
    verifyMfa,
    register,
    logout: logoutUser,
    checkSession,
    updateProfile,
    refreshSessions,
    logoutOtherSessions,
    terminateSession,
    completeOnboarding,
  };
}
