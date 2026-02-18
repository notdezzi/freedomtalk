'use client';

import { useEffect, useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhoneOff, Users, Volume2 } from 'lucide-react';
import { useVoiceStore, VoiceUser } from '@/stores/voiceStore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { apiClient } from '@/lib/api-client';
import { createVoiceClient, getVoiceClient } from '@/lib/voice-client';
import VideoGrid from './VideoGrid';
import VoiceConnectedPanel from './VoiceConnectedPanel';

interface VoiceChannelViewProps {
  channelId: string;
  serverId: string;
}

export default function VoiceChannelView({ channelId, serverId }: VoiceChannelViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { getSocket } = useSocket();

  const {
    isConnected,
    currentChannelId,
    sessionId,
    users,
    localAudioStream,
    localVideoStream,
    localScreenStream,
    connectToChannel,
    disconnectFromChannel,
    setUsers,
    addUser,
    removeUser,
    updateUser,
    updateUserStream,
    clearUserStreams,
    setLocalAudioStream,
    setLocalVideoStream,
    setLocalScreenStream,
    setError,
    isConnecting,
    error,
  } = useVoiceStore();

  const [loading, setLoading] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{ name: string } | null>(null);

  // Check if we're already in this channel
  const isInThisChannel = isConnected && currentChannelId === channelId;

  // Setup voice client and join channel
  useEffect(() => {
    if (!user || !channelId || !serverId) return;
    if (isInThisChannel) return; // Already connected
    if (loading) return; // Already loading

    const joinVoiceChannel = async () => {
      setLoading(true);
      setError(null);

      try {
        const socket = getSocket();
        if (!socket) {
          throw new Error('WebSocket not connected');
        }

        // Create voice client and setup callbacks
        const voiceClient = createVoiceClient(socket);

        // Setup callbacks for remote streams
        voiceClient.onRemoteStreamChanged = (remoteSessionId, kind, stream) => {
          updateUserStream(remoteSessionId, kind, stream);
        };

        voiceClient.onUserJoined = (userId, joinedSessionId) => {
          const voiceUser: VoiceUser = {
            userId,
            username: '',
            channelId,
            sessionId: joinedSessionId,
            selfMute: false,
            selfDeaf: false,
            selfVideo: false,
            selfStream: false,
            suppress: false,
            isSpeaking: false,
          };
          addUser(channelId, voiceUser);
        };

        voiceClient.onUserLeft = (leftSessionId) => {
          clearUserStreams(leftSessionId);
          removeUser(channelId, leftSessionId);
        };

        voiceClient.onUserStateChange = (changedSessionId, state) => {
          updateUser(channelId, changedSessionId, state);
        };

        voiceClient.onUserSpeaking = (speakingSessionId, speaking) => {
          updateUser(channelId, speakingSessionId, { isSpeaking: speaking });
        };

        voiceClient.onError = (err) => {
          setError(err);
          setLoading(false);
        };

        voiceClient.onDisconnected = () => {
          disconnectFromChannel();
        };

        // Join the channel (auto-creates device, transports, and starts audio)
        await voiceClient.joinChannel(channelId);

        // Get session info
        const newSessionId = voiceClient.getSessionId();
        if (!newSessionId) {
          throw new Error('Failed to get session ID');
        }

        // Update store with local streams
        const audioStream = voiceClient.getLocalAudioStream();
        if (audioStream) {
          setLocalAudioStream(audioStream);
        }

        // Connect voice store
        connectToChannel(channelId, serverId, newSessionId);

        // Add current user to voice users list
        const currentUserVoice: VoiceUser = {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          channelId,
          sessionId: newSessionId,
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

          const voiceUsers: VoiceUser[] = usersArray.map((u: unknown) => {
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

        // Fetch channel info for header
        // const channelResponse = await apiClient.getChannel(channelId);
        // if (channelResponse.success && channelResponse.data) {
        //   setChannelInfo({ name: channelResponse.data.name });
        // }

      } catch (err) {
        console.error('Voice join error:', err);
        setError('Failed to join voice channel');
      } finally {
        setLoading(false);
      }
    };

    joinVoiceChannel();

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - let the user control this
      // The VoiceConnectedPanel handles disconnect
    };
  }, [user, channelId, serverId, isInThisChannel, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    const voiceClient = getVoiceClient();
    if (voiceClient) {
      await voiceClient.leaveChannel();
    }

    setLocalAudioStream(null);
    setLocalVideoStream(null);
    setLocalScreenStream(null);
    disconnectFromChannel();

    // Navigate away from voice view
    router.push(`/app/servers/${serverId}`);
  }, [disconnectFromChannel, router, serverId, setLocalAudioStream, setLocalVideoStream, setLocalScreenStream]);

  // Loading state
  if (loading || !isInThisChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-muted">Connecting to voice channel...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={() => router.push(`/app/servers/${serverId}`)}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // User count for display
  const userCount = users.length;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-background-elevated flex-shrink-0">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-accent" />
          <span className="font-semibold text-foreground">
            {channelInfo?.name || 'Voice Channel'}
          </span>
          <span className="flex items-center gap-1 text-sm text-foreground-muted">
            <Users className="w-4 h-4" />
            {userCount}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-error/20 text-error hover:bg-error/30 transition-colors"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden">
        <VideoGrid channelId={channelId} />
      </div>

      {/* Voice Connected Panel (controls at bottom) */}
      <VoiceConnectedPanel />
    </div>
  );
}
