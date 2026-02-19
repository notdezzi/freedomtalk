import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, User } from '@/stores/authStore';
import { apiClient, getStoredRefreshToken, setStoredRefreshToken } from '@/lib/api-client';

// Global state to deduplicate session checks across all hook instances
let sessionCheckPromise: Promise<void> | null = null;
let hasCompletedSessionCheck = false;

export function useAuth() {
  const router = useRouter();
  const {
    user,
    sessions,
    isAuthenticated,
    isLoading,
    isOnboardingComplete,
    setUser,
    setSessions,
    setLoading,
    setOnboardingComplete,
    login: storeLogin,
    logout: storeLogout,
    removeSession,
    updateProfile: storeUpdateProfile,
  } = useAuthStore();

  // Ref to track if this component instance has triggered a session check
  const hasTriggeredCheck = useRef(false);

  // Check session on mount - with deduplication to prevent multiple simultaneous requests
  useEffect(() => {
    // Skip if we've already triggered a check from this instance
    if (hasTriggeredCheck.current) return;
    hasTriggeredCheck.current = true;

    const checkSession = async () => {
      const token = apiClient.getAccessToken();

      if (!token) {
        setLoading(false);
        return;
      }

      // If session was already successfully checked globally, don't check again
      if (hasCompletedSessionCheck) {
        setLoading(false);
        return;
      }

      // If a session check is already in progress, wait for it
      if (sessionCheckPromise) {
        await sessionCheckPromise;
        return;
      }

      // Create the promise and assign it IMMEDIATELY to prevent race conditions
      let resolvePromise: () => void;
      sessionCheckPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      try {
        const response = await apiClient.getSession();

        if (response.success && response.data?.user) {
          const userData = response.data.user;
          const user: User = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            avatar: userData.avatar,
            displayName: userData.displayName,
            isVerified: userData.emailVerified,
            has2FA: userData.mfaEnabled,
            createdAt: new Date().toISOString(),
          };
          setUser(user);
          hasCompletedSessionCheck = true;

          // Set onboarding status from API - this is the source of truth
          setOnboardingComplete(!!userData.onboardingComplete);
        } else {
          // Token is invalid, try to refresh
          const refreshResponse = await apiClient.refreshTokens();

          if (refreshResponse.success) {
            // Retry getting session with new token
            const retryResponse = await apiClient.getSession();
            if (retryResponse.success && retryResponse.data?.user) {
              const userData = retryResponse.data.user;
              const user: User = {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                avatar: userData.avatar,
                displayName: userData.displayName,
                isVerified: userData.emailVerified,
                has2FA: userData.mfaEnabled,
                createdAt: new Date().toISOString(),
              };
              setUser(user);
              hasCompletedSessionCheck = true;

              // Set onboarding status from API - this is the source of truth
              setOnboardingComplete(!!userData.onboardingComplete);
            } else {
              // Refresh succeeded but session still invalid - clear user
              setUser(null);
              setOnboardingComplete(false);
              hasCompletedSessionCheck = true;
            }
          } else {
            // Refresh failed - clear user and mark as checked
            setUser(null);
            setOnboardingComplete(false);
            hasCompletedSessionCheck = true;
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setUser(null);
        setOnboardingComplete(false);
        hasCompletedSessionCheck = true;
      } finally {
        setLoading(false);
        resolvePromise!();
        sessionCheckPromise = null;
      }
    };

    checkSession();

    // Cleanup: reset the trigger ref if component unmounts before check completes
    return () => {
      // Don't reset hasTriggeredCheck here - we want to prevent re-checks
      // even if the component remounts (React Strict Mode)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);

    try {
      const response = await apiClient.login(email, password);

      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Login failed',
          mfaRequired: false,
        };
      }

      const data = response.data;

      // Check if MFA is required
      if (data?.mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          sessionId: data.sessionId,
        };
      }

      // Tokens are already stored by apiClient.login
      // Create user object
      const user: User = {
        id: data!.user.id,
        username: data!.user.username,
        email: data!.user.email,
        isVerified: data!.user.emailVerified,
        has2FA: false,
        createdAt: new Date().toISOString(),
      };

      storeLogin(user);

      // Mark session as checked to prevent redundant session API calls
      hasCompletedSessionCheck = true;

      // Set onboarding status from login response
      const onboardingComplete = data!.user.onboardingComplete ?? false;
      setOnboardingComplete(onboardingComplete);

      // Redirect based on onboarding status from API
      if (!onboardingComplete) {
        router.push('/onboarding');
      } else {
        router.push('/app');
      }

      return { success: true, mfaRequired: false };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        mfaRequired: false,
      };
    } finally {
      setLoading(false);
    }
  }, [storeLogin, setLoading, setOnboardingComplete, router]);

  const verifyMfa = useCallback(async (sessionId: string, code: string) => {
    setLoading(true);

    try {
      const response = await apiClient.verifyMfa(sessionId, code);

      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'MFA verification failed',
        };
      }

      const data = response.data;

      // Tokens are already stored by apiClient.verifyMfa
      // Create user object
      const user: User = {
        id: data!.user.id,
        username: data!.user.username,
        email: data!.user.email,
        isVerified: data!.user.emailVerified,
        has2FA: true,
        createdAt: new Date().toISOString(),
      };

      storeLogin(user);

      // Mark session as checked to prevent redundant session API calls
      hasCompletedSessionCheck = true;

      // Set onboarding status from MFA verification response
      const onboardingComplete = data!.user.onboardingComplete ?? false;
      setOnboardingComplete(onboardingComplete);

      // Redirect based on onboarding status from API
      if (!onboardingComplete) {
        router.push('/onboarding');
      } else {
        router.push('/app');
      }

      return { success: true };
    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MFA verification failed',
      };
    } finally {
      setLoading(false);
    }
  }, [storeLogin, setLoading, setOnboardingComplete, router]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setLoading(true);

    try {
      const response = await apiClient.register(username, email, password);

      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Registration failed',
        };
      }

      // Registration successful - redirect to login with message
      router.push('/auth/login?registered=true');

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    } finally {
      setLoading(false);
    }
  }, [setLoading, router]);

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Reset session check state so user can log back in
    sessionCheckPromise = null;
    hasCompletedSessionCheck = false;

    storeLogout();
    router.push('/auth/login');
    setLoading(false);

    return { success: true };
  }, [storeLogout, setLoading, router]);

  const logoutOtherSessions = useCallback(async (keepSessionId: string) => {
    try {
      // TODO: Implement API call to logout other sessions
      setSessions(sessions.filter((s) => s.id === keepSessionId));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to logout other sessions',
      };
    }
  }, [sessions, setSessions]);

  const terminateSession = useCallback(async (sessionId: string) => {
    try {
      // TODO: Implement API call to terminate session
      removeSession(sessionId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to terminate session',
      };
    }
  }, [removeSession]);

  const refreshSessions = useCallback(async () => {
    try {
      // TODO: Implement API call to fetch sessions
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to refresh sessions',
      };
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      const response = await apiClient.completeOnboarding();
      if (response.success) {
        setOnboardingComplete(true);
        router.push('/app');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Still navigate to app even if API fails
      setOnboardingComplete(true);
      router.push('/app');
    }
  }, [setOnboardingComplete, router]);

  const updateProfile = useCallback(async (updates: { username?: string; bio?: string; avatar?: string; displayName?: string }) => {
    // Update local store first for immediate feedback
    storeUpdateProfile(updates);

    // Then sync with API
    try {
      await apiClient.updateProfile({
        displayName: updates.displayName,
        bio: updates.bio,
        avatarUrl: updates.avatar,
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }, [storeUpdateProfile]);

  return {
    user,
    sessions,
    isAuthenticated,
    isLoading,
    isOnboardingComplete,
    setUser,
    setSessions,
    setLoading,
    loginWithEmail,
    verifyMfa,
    register,
    logout,
    logoutOtherSessions,
    terminateSession,
    refreshSessions,
    updateProfile,
    completeOnboarding,
  };
}
