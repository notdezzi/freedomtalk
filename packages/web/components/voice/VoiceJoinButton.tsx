'use client';

import { useState, useCallback, useEffect } from 'react';
import { Volume2, Loader2, VolumeX } from 'lucide-react';
import { useVoiceStore } from '@/stores/voiceStore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { apiClient } from '@/lib/api-client';
import { createVoiceClient, getVoiceClient, VoiceClient } from '@/lib/voice-client';

interface VoiceJoinButtonProps {
  channelId: string;
  serverId: string;
}

export default function VoiceJoinButton({ channelId, serverId }: VoiceJoinButtonProps) {
  const { user } = useAuth();
  const {
    isConnected,
    currentChannelId,
    connectToChannel,
    disconnectFromChannel,
    setUsers,
    addUser,
    removeUser,
    updateUser,
    isConnecting,
    setError,
  } = useVoiceStore();
  const { getSocket } = useSocket();

  const [loading, setLoading] = useState(false);
  const [voiceClient, setVoiceClient] = useState<VoiceClient | null>(null);

  // If already in this channel, don't show join button
  if (isConnected && currentChannelId === channelId) {
    return null;
  }

  // Setup voice client callbacks
  const setupVoiceClientCallbacks = useCallback((client: VoiceClient) => {
    client.onUserJoined = (userId, sessionId) => {
      // Add user to the voice channel list
      const voiceUser = {
        userId,
        username: '', // Will be updated when we get full user data
        channelId,
        sessionId,
        selfMute: false,
        selfDeaf: false,
        selfVideo: false,
        selfStream: false,
        suppress: false,
        isSpeaking: false,
      };
      addUser(channelId, voiceUser);
    };

    client.onUserLeft = (sessionId) => {
      removeUser(channelId, sessionId);
    };

    client.onUserStateChange = (sessionId, state) => {
      updateUser(channelId, sessionId, state);
    };

    client.onUserSpeaking = (sessionId, speaking) => {
      updateUser(channelId, sessionId, { isSpeaking: speaking });
    };

    client.onProducerCreated = (producerId, kind, sessionId) => {
      console.log('New producer:', producerId, kind, sessionId);
    };

    client.onError = (error) => {
      setError(error);
      setLoading(false);
    };

    client.onDisconnected = () => {
      disconnectFromChannel();
    };
  }, [channelId, addUser, removeUser, updateUser, setError, disconnectFromChannel]);

  const handleJoin = async () => {
    if (!user || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Get the socket for voice client
      const socket = getSocket();
      if (!socket) {
        throw new Error('WebSocket not connected');
      }

      // Join via REST API to create voice state
      const response = await apiClient.joinVoiceChannel(channelId);

      if (response.success && response.data) {
        const { sessionId } = response.data;

        // Create voice client and setup callbacks
        const client = createVoiceClient(socket);
        setupVoiceClientCallbacks(client);
        setVoiceClient(client);

        // Connect to voice channel via WebRTC
        await client.joinChannel(channelId);

        // Connect voice store
        connectToChannel(channelId, serverId, sessionId);

        // Add current user to voice users list
        const currentUserVoice = {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          channelId,
          sessionId,
          selfMute: false,
          selfDeaf: false,
          selfVideo: false,
          selfStream: false,
          suppress: false,
          isSpeaking: false,
        };
        addUser(channelId, currentUserVoice);

        // Fetch current users in channel
        const usersResponse = await apiClient.getVoiceChannelUsers(channelId);
        if (usersResponse.success && usersResponse.data) {
          const usersArray = Array.isArray(usersResponse.data)
            ? usersResponse.data
            : (usersResponse.data as { users?: unknown[] }).users || [];

          const voiceUsers = usersArray.map((u: unknown) => {
            const userData = u as Record<string, unknown>;
            return {
              userId: String(userData.userId || userData.user_id || ''),
              username: String(userData.username || ''),
              displayName: userData.displayName as string | undefined,
              avatar: userData.avatar as string | undefined,
              channelId,
              sessionId: String(userData.sessionId || userData.session_id || ''),
              selfMute: Boolean(userData.selfMute ?? userData.self_mute),
              selfDeaf: Boolean(userData.selfDeaf ?? userData.self_deaf),
              selfVideo: Boolean(userData.selfVideo ?? userData.self_video),
              selfStream: Boolean(userData.selfStream ?? userData.self_stream),
              suppress: Boolean(userData.suppress),
              isSpeaking: false,
            };
          });

          setUsers(channelId, voiceUsers);
        }

        // Start audio automatically
        try {
          await client.startAudio();
        } catch (audioError) {
          console.warn('Could not start audio automatically:', audioError);
          // Non-fatal - user can manually enable
        }
      } else {
        setError(response.error?.message || 'Failed to join voice channel');
      }
    } catch (err) {
      setError('Failed to join voice channel');
      console.error('Voice join error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleJoin}
      disabled={loading || (isConnected && currentChannelId !== channelId)}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
      {isConnected && currentChannelId !== channelId ? 'Switch Channel' : 'Join Voice'}
    </button>
  );
}
