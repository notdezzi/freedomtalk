'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhoneOff, Users, Volume2 } from 'lucide-react';
import { useVoiceStore, VoiceUser } from '@/stores/voiceStore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { apiClient } from '@/lib/api-client';
import { createVoiceClient, getVoiceClient, resetVoiceClient } from '@/lib/voice-client';
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
    lastTextChannelId,
    lastTextChannelServerId,
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
    error,
  } = useVoiceStore();

  const [loading, setLoading] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{ name: string } | null>(null);

  // Use a ref to prevent double-joining (React StrictMode safe)
  const joinInitiatedRef = useRef(false);
  const mountedRef = useRef(true);
  const joiningRef = useRef(false);
  const wasConnectedRef = useRef(false);

  // Check if we're already in this channel
  const isInThisChannel = isConnected && currentChannelId === channelId;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Track when we were connected - redirect when disconnected
  useEffect(() => {
    if (isInThisChannel) {
      wasConnectedRef.current = true;
    }

    // If we were connected but now we're not, redirect to last text channel or /app
    if (wasConnectedRef.current && !isConnected && mountedRef.current) {
      console.log('[VoiceChannelView] Disconnected, redirecting...');
      wasConnectedRef.current = false;

      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        if (lastTextChannelId && lastTextChannelServerId) {
          router.push(`/app/servers/${lastTextChannelServerId}/channels/${lastTextChannelId}`);
        } else if (serverId) {
          router.push(`/app/servers/${serverId}`);
        } else {
          router.push('/app');
        }
      }, 0);
    }
  }, [isConnected, isInThisChannel, router, lastTextChannelId, lastTextChannelServerId, serverId]);

  // Setup voice client and join channel
  useEffect(() => {
    if (!user || !channelId || !serverId) return;
    if (isInThisChannel) return; // Already connected

    // StrictMode-safe: Check if we're already in the process of joining THIS channel
    // Use both the ref and the VoiceClient's internal state
    const existingClient = getVoiceClient();
    if (joiningRef.current) {
      console.log('[VoiceChannelView] Join already in progress for this component, skipping');
      return;
    }
    // Check if VoiceClient is already in this channel (handles StrictMode remount)
    if (existingClient && existingClient.getChannelId() === channelId && existingClient.getSessionId()) {
      console.log('[VoiceChannelView] Already joined this channel in VoiceClient, updating store');
      // Update store with existing session
      connectToChannel(channelId, serverId, existingClient.getSessionId()!);
      const audioStream = existingClient.getLocalAudioStream();
      if (audioStream) {
        setLocalAudioStream(audioStream);
      }
      return;
    }

    joiningRef.current = true;
    joinInitiatedRef.current = true;
    setLoading(true);
    setError(null);

    // Create abort controller for cleanup
    let aborted = false;
    let joinSucceeded = false; // Track if THIS effect's join succeeded
    let voiceClient: ReturnType<typeof createVoiceClient> | null = null;

    const joinVoiceChannel = async () => {
      try {
        const socket = getSocket();
        if (!socket) {
          throw new Error('WebSocket not connected');
        }

        // Get or create voice client (don't reset - let it manage its own state)
        voiceClient = createVoiceClient(socket);

        // Setup callbacks for remote streams
        voiceClient.onRemoteStreamChanged = (remoteSessionId, kind, stream) => {
          if (!aborted && mountedRef.current) {
            updateUserStream(remoteSessionId, kind, stream);
          }
        };

        voiceClient.onUserJoined = (userId, joinedSessionId) => {
          if (aborted || !mountedRef.current) return;
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
          if (aborted || !mountedRef.current) return;
          clearUserStreams(leftSessionId);
          removeUser(channelId, leftSessionId);
        };

        voiceClient.onUserStateChange = (changedSessionId, state) => {
          if (aborted || !mountedRef.current) return;
          updateUser(channelId, changedSessionId, state);
        };

        voiceClient.onUserSpeaking = (speakingSessionId, speaking) => {
          if (aborted || !mountedRef.current) return;
          updateUser(channelId, speakingSessionId, { isSpeaking: speaking });
        };

        voiceClient.onError = (err) => {
          if (!aborted && mountedRef.current) {
            setError(err);
            setLoading(false);
            joinInitiatedRef.current = false;
            joiningRef.current = false;
          }
        };

        voiceClient.onDisconnected = () => {
          if (!aborted && mountedRef.current) {
            disconnectFromChannel();
            joinInitiatedRef.current = false;
            joiningRef.current = false;
          }
        };

        // Join the channel (auto-creates device, transports, and starts audio)
        await voiceClient.joinChannel(channelId);

        // Check if aborted during async join (StrictMode remount)
        if (aborted) {
          console.log('[VoiceChannelView] Join completed but effect was aborted, leaving connection for next effect');
          // DON'T cleanup - the next effect will use this connection
          // The VoiceClient singleton preserves the session
          return;
        }

        if (!mountedRef.current) {
          // Component truly unmounted (not StrictMode), clean up
          console.log('[VoiceChannelView] Component unmounted, cleaning up');
          await voiceClient.leaveChannel();
          resetVoiceClient();
          return;
        }

        // Get session info
        const newSessionId = voiceClient.getSessionId();
        console.log('[VoiceChannelView] After join, sessionId:', newSessionId);
        if (!newSessionId) {
          // This shouldn't happen if joinChannel succeeded
          console.error('[VoiceChannelView] sessionId is null after successful join');
          throw new Error('Failed to get session ID - join may have failed silently');
        }

        // Mark join as succeeded BEFORE updating store
        joinSucceeded = true;
        joiningRef.current = false; // Allow future joins

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
        if (!aborted && usersResponse.success && usersResponse.data && mountedRef.current) {
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

      } catch (err) {
        console.error('Voice join error:', err);
        if (!aborted && mountedRef.current) {
          // Reset voice client on failure so we can retry fresh
          resetVoiceClient();
          setError('Failed to join voice channel');
          joinInitiatedRef.current = false;
          joiningRef.current = false;
        }
      } finally {
        if (!aborted && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    joinVoiceChannel();

    // Cleanup function - critical for React StrictMode
    return () => {
      // If THIS effect's join succeeded, don't cleanup - the connection is working
      if (joinSucceeded) {
        console.log('[VoiceChannelView] Effect cleanup - join succeeded, keeping connection');
        return;
      }

      console.log('[VoiceChannelView] Effect cleanup - marking as aborted');
      aborted = true;
      joiningRef.current = false;
      joinInitiatedRef.current = false;

      // DON'T call leaveChannel() here - it resets VoiceClient state
      // which allows the next effect to start a new join.
      // Instead, let the VoiceClient's isJoining flag prevent duplicate joins.
      // The aborted flag will cause the join to reject if the callback fires.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, channelId, serverId, isInThisChannel]);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      const voiceClient = getVoiceClient();
      if (voiceClient) {
        await voiceClient.leaveChannel();
      }

      if (currentChannelId) {
        await apiClient.leaveVoiceChannel(currentChannelId);
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      // Always reset state even if leaveChannel fails
      setLocalAudioStream(null);
      setLocalVideoStream(null);
      setLocalScreenStream(null);
      disconnectFromChannel();
      resetVoiceClient();
      joinInitiatedRef.current = false;
      joiningRef.current = false;

      // Navigate to last text channel or /app if none
      if (lastTextChannelId && lastTextChannelServerId) {
        router.push(`/app/servers/${lastTextChannelServerId}/channels/${lastTextChannelId}`);
      } else {
        router.push('/app');
      }
    }
  }, [disconnectFromChannel, router, setLocalAudioStream, setLocalVideoStream, setLocalScreenStream, currentChannelId, lastTextChannelId, lastTextChannelServerId]);

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
            onClick={() => {
              resetVoiceClient();
              setError(null);
              joinInitiatedRef.current = false;
            }}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors mr-2"
          >
            Retry
          </button>
          <button
            onClick={() => router.push(`/app/servers/${serverId}`)}
            className="px-4 py-2 bg-background-surface text-foreground rounded hover:bg-background transition-colors"
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
