/**
 * useServerVoiceStates Hook
 * Fetches and manages voice states for all channels in a server
 * This allows showing who's in which voice channel even when not connected
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVoiceStore } from '@/stores';
import { apiClient } from '@/lib/api-client';
import { socketService } from '@/lib/socket';
import type { VoiceUser } from '@/types';

interface ServerVoiceStatesResponse {
  success: boolean;
  data: {
    channelStates: Record<string, Array<{
      userId: string;
      sessionId: string;
      username: string;
      avatar: string | null;
      selfMute: boolean;
      selfDeaf: boolean;
      selfVideo: boolean;
      selfStream: boolean;
    }>>;
  };
}

export function useServerVoiceStates(serverId: string | undefined) {
  const queryClient = useQueryClient();
  const {
    setChannelStates,
    addUserToChannelState,
    removeUserFromChannelState,
    updateUserInChannelState,
    clearChannelStates,
    currentChannelId,
    sessionId: currentSessionId,
  } = useVoiceStore();

  // Fetch voice states for the server
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['server-voice-states', serverId],
    queryFn: async () => {
      if (!serverId) return null;
      const response = await apiClient.get<ServerVoiceStatesResponse>(
        `/api/v1/voice/servers/${serverId}/states`
      );
      return response.data?.data ?? null;
    },
    enabled: !!serverId,
    staleTime: 0, // Always refetch when window refocuses
    refetchOnWindowFocus: true,
  });

  // Update store when data changes
  useEffect(() => {
    if (data?.channelStates) {
      // Convert to VoiceUser format
      const formattedStates: Record<string, VoiceUser[]> = {};
      for (const [channelId, users] of Object.entries(data.channelStates)) {
        formattedStates[channelId] = users.map((u: {
          userId: string;
          sessionId: string;
          username: string;
          avatar: string | null;
          selfMute: boolean;
          selfDeaf: boolean;
          selfVideo: boolean;
          selfStream: boolean;
        }) => ({
          userId: u.userId,
          sessionId: u.sessionId,
          username: u.username,
          avatar: u.avatar ?? undefined,
          channelId,
          selfMute: u.selfMute,
          selfDeaf: u.selfDeaf,
          selfVideo: u.selfVideo,
          selfStream: u.selfStream,
        }));
      }
      setChannelStates(formattedStates);
    }
  }, [data, setChannelStates]);

  // Clear channel states when server changes
  useEffect(() => {
    return () => {
      clearChannelStates();
    };
  }, [serverId, clearChannelStates]);

  // Listen for voice state changes via WebSocket
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !serverId) return;

    // Handle user joining a voice channel
    const handleUserJoined = (data: {
      userId: string;
      sessionId: string;
      username: string;
      avatar: string | null;
      channelId: string;
    }) => {
      // Skip if this is the current user (they're already in the store via useVoiceConnection)
      if (data.sessionId === currentSessionId) return;

      const voiceUser: VoiceUser = {
        userId: data.userId,
        sessionId: data.sessionId,
        username: data.username,
        avatar: data.avatar ?? undefined,
        channelId: data.channelId,
        selfMute: false,
        selfDeaf: false,
        selfVideo: false,
        selfStream: false,
      };
      addUserToChannelState(data.channelId, voiceUser);
    };

    // Handle user leaving a voice channel
    const handleUserLeft = (data: { sessionId: string; channelId: string }) => {
      removeUserFromChannelState(data.channelId, data.sessionId);
    };

    // Handle user state changes (mute, deaf, video, stream)
    const handleUserState = (data: {
      sessionId: string;
      channelId: string;
      selfMute?: boolean;
      selfDeaf?: boolean;
      selfVideo?: boolean;
      selfStream?: boolean;
    }) => {
      updateUserInChannelState(data.channelId, data.sessionId, {
        selfMute: data.selfMute,
        selfDeaf: data.selfDeaf,
        selfVideo: data.selfVideo,
        selfStream: data.selfStream,
      });
    };

    socket.on('voice:user_joined', handleUserJoined);
    socket.on('voice:user_left', handleUserLeft);
    socket.on('voice:user_state', handleUserState);

    return () => {
      socket.off('voice:user_joined', handleUserJoined);
      socket.off('voice:user_left', handleUserLeft);
      socket.off('voice:user_state', handleUserState);
    };
  }, [serverId, currentSessionId, addUserToChannelState, removeUserFromChannelState, updateUserInChannelState]);

  // Refresh function
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['server-voice-states', serverId] });
  }, [queryClient, serverId]);

  return {
    isLoading,
    error,
    refresh,
  };
}
