/**
 * useVoiceConnection Hook
 * Manages VoiceClient lifecycle and connects it to the voice store
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useVoiceStore } from '@/stores';
import { socketService } from '@/lib/socket';
import {
  createVoiceClient,
  resetVoiceClient,
  type VoiceClient,
  type ExistingUser,
} from '@/lib/voice-client';
import type { VoiceUser } from '@/types';

export function useVoiceConnection() {
  const user = useAuthStore((s) => s.user);
  const voiceClientRef = useRef<VoiceClient | null>(null);

  const {
    setConnected,
    setConnecting,
    setError,
    disconnect: storeDisconnect,
    setUsers,
    addUser,
    removeUser,
    updateUser,
    setLocalAudioStream,
    setLocalVideoStream,
    setLocalScreenStream,
  } = useVoiceStore();

  // Initialize voice client when socket is ready
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !user) return;

    // Create voice client if not exists
    if (!voiceClientRef.current) {
      voiceClientRef.current = createVoiceClient(socket);

      // Set up callbacks
      voiceClientRef.current.onConnected = (existingUsers: ExistingUser[]) => {
        const client = voiceClientRef.current;
        if (!client) return;

        const currentChannelId = client.getChannelId();
        const currentSessionId = client.getSessionId();

        setConnected(
          true,
          currentChannelId ?? undefined,
          undefined,
          currentSessionId ?? undefined
        );

        // Set local streams
        setLocalAudioStream(client.getLocalAudioStream());
        setLocalVideoStream(client.getLocalVideoStream());
        setLocalScreenStream(client.getLocalScreenStream());

        // Add existing remote users to store
        const remoteVoiceUsers: VoiceUser[] = existingUsers.map(u => ({
          userId: u.userId,
          username: u.username,
          avatar: u.avatar ?? undefined,
          channelId: currentChannelId ?? '',
          sessionId: u.sessionId,
          selfMute: u.selfMute,
          selfDeaf: u.selfDeaf,
          selfVideo: u.selfVideo,
          selfStream: u.selfStream,
        }));

        // Add current user to the store as well (so they appear in sidebar)
        if (user && currentSessionId && currentChannelId) {
          const currentUserVoice: VoiceUser = {
            userId: user.id,
            username: user.username,
            avatar: user.avatar,
            channelId: currentChannelId,
            sessionId: currentSessionId,
            selfMute: false,
            selfDeaf: false,
            selfVideo: false,
            selfStream: false,
            isSpeaking: false,
          };
          // Set users including current user
          setUsers([currentUserVoice, ...remoteVoiceUsers]);
        } else {
          setUsers(remoteVoiceUsers);
        }
      };

      voiceClientRef.current.onDisconnected = () => {
        storeDisconnect();
      };

      voiceClientRef.current.onError = (error: string) => {
        setError(error);
      };

      voiceClientRef.current.onUserJoined = (userId: string, sessionId: string, username: string, avatar: string | null) => {
        const client = voiceClientRef.current;
        if (!client) return;

        const currentChannelId = client.getChannelId();

        // Add user with the info provided by the server
        const voiceUser: VoiceUser = {
          userId,
          username: username || 'User',
          avatar: avatar ?? undefined,
          channelId: currentChannelId ?? '',
          sessionId,
          selfMute: false,
          selfDeaf: false,
          selfVideo: false,
          selfStream: false,
        };
        addUser(voiceUser);
      };

      voiceClientRef.current.onUserLeft = (sessionId: string) => {
        removeUser(sessionId);
      };

      voiceClientRef.current.onUserStateChange = (
        sessionId: string,
        state: { selfMute?: boolean; selfDeaf?: boolean; selfVideo?: boolean; selfStream?: boolean }
      ) => {
        // Find user by sessionId and update
        const users = useVoiceStore.getState().users;
        const userToUpdate = users.find((u) => u.sessionId === sessionId);
        if (userToUpdate) {
          // Build update object - also clear streams when video/screen is turned off
          const updates: Partial<VoiceUser> = { ...state };
          if (state.selfVideo === false) {
            updates.videoStream = undefined;
          }
          if (state.selfStream === false) {
            updates.screenStream = undefined;
          }
          updateUser(userToUpdate.userId, updates);
        }
      };

      voiceClientRef.current.onUserSpeaking = (sessionId: string, speaking: boolean) => {
        const users = useVoiceStore.getState().users;
        const userToUpdate = users.find((u) => u.sessionId === sessionId);
        if (userToUpdate) {
          updateUser(userToUpdate.userId, { isSpeaking: speaking });
        }
      };

      voiceClientRef.current.onRemoteStreamChanged = (
        sessionId: string,
        kind: 'audio' | 'video' | 'screen',
        stream: MediaStream | null
      ) => {
        const users = useVoiceStore.getState().users;
        const userToUpdate = users.find((u) => u.sessionId === sessionId);
        if (userToUpdate) {
          if (kind === 'audio') {
            updateUser(userToUpdate.userId, { audioStream: stream ?? undefined });
          } else if (kind === 'video') {
            updateUser(userToUpdate.userId, { videoStream: stream ?? undefined, selfVideo: !!stream });
          } else if (kind === 'screen') {
            updateUser(userToUpdate.userId, { screenStream: stream ?? undefined, selfStream: !!stream });
          }
        }
      };

      // Handle local speaking detection
      voiceClientRef.current.onSpeaking = (speaking: boolean) => {
        const currentSessionId = voiceClientRef.current?.getSessionId();
        if (currentSessionId && user) {
          // Update the current user's speaking state in the store
          updateUser(user.id, { isSpeaking: speaking });
        }
      };
    }

    return () => {
      // Don't reset on unmount - let the voice client persist
      // It will be cleaned up when the user leaves voice or disconnects
    };
  }, [user?.id]);

  // Join a voice channel
  const joinChannel = useCallback(async (channelId: string) => {
    const client = voiceClientRef.current;
    if (!client) {
      setError('Voice client not initialized');
      return;
    }

    // Clear any existing users first
    setUsers([]);

    // Store current text channel for return navigation
    const { currentChannelId, currentServerId } = useVoiceStore.getState();
    if (currentChannelId) {
      useVoiceStore.getState().setLastTextChannel(currentChannelId, currentServerId);
    }

    setConnecting(true);

    try {
      await client.joinChannel(channelId);
    } catch (error: any) {
      setError(error.message || 'Failed to join voice channel');
    }
  }, [setConnecting, setError, setUsers]);

  // Leave current voice channel
  const leaveChannel = useCallback(async () => {
    const client = voiceClientRef.current;
    if (!client) return;

    try {
      await client.leaveChannel();
    } catch (error: any) {
      console.error('Error leaving voice channel:', error);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const client = voiceClientRef.current;
    if (!client) return;

    const { selfMute, sessionId } = useVoiceStore.getState();
    const newMuteState = !selfMute;
    client.setMuted(newMuteState);
    useVoiceStore.getState().setSelfMute(newMuteState);

    // Update current user in users array
    if (user && sessionId) {
      updateUser(user.id, { selfMute: newMuteState, isSpeaking: false });
    }
  }, [user?.id, updateUser]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    const { selfDeaf, sessionId } = useVoiceStore.getState();
    const newDeafState = !selfDeaf;
    useVoiceStore.getState().setSelfDeaf(newDeafState);

    // Update current user in users array
    if (user && sessionId) {
      updateUser(user.id, { selfDeaf: newDeafState });
    }

    // When deafening, also mute
    if (!selfDeaf) {
      const client = voiceClientRef.current;
      if (client) {
        client.setMuted(true);
        useVoiceStore.getState().setSelfMute(true);

        // Update current user's mute state and reset speaking
        if (user && sessionId) {
          updateUser(user.id, { selfMute: true, isSpeaking: false });
        }
      }
    }
  }, [user?.id, updateUser]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const client = voiceClientRef.current;
    if (!client) return;

    const { selfVideo, sessionId } = useVoiceStore.getState();

    try {
      if (selfVideo) {
        await client.stopVideo();
        useVoiceStore.getState().setSelfVideo(false);
        setLocalVideoStream(null);
        if (user && sessionId) {
          // Clear both selfVideo flag AND videoStream
          updateUser(user.id, { selfVideo: false, videoStream: undefined });
        }
      } else {
        await client.startVideo();
        useVoiceStore.getState().setSelfVideo(true);
        setLocalVideoStream(client.getLocalVideoStream());
        if (user && sessionId) {
          const stream = client.getLocalVideoStream();
          updateUser(user.id, { selfVideo: true, videoStream: stream ?? undefined });
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to toggle video');
    }
  }, [setLocalVideoStream, setError, user?.id, updateUser]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    const client = voiceClientRef.current;
    if (!client) return;

    const { selfStream, sessionId } = useVoiceStore.getState();

    try {
      if (selfStream) {
        await client.stopScreenShare();
        useVoiceStore.getState().setSelfStream(false);
        setLocalScreenStream(null);
        if (user && sessionId) {
          // Clear both selfStream flag AND screenStream
          updateUser(user.id, { selfStream: false, screenStream: undefined });
        }
      } else {
        await client.startScreenShare();
        useVoiceStore.getState().setSelfStream(true);
        setLocalScreenStream(client.getLocalScreenStream());
        if (user && sessionId) {
          const stream = client.getLocalScreenStream();
          updateUser(user.id, { selfStream: true, screenStream: stream ?? undefined });
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to toggle screen share');
    }
  }, [setLocalScreenStream, setError, user?.id, updateUser]);

  // Get the voice client
  const getVoiceClient = useCallback(() => voiceClientRef.current, []);

  return {
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    getVoiceClient,
  };
}
