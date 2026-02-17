'use client';

import { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { useVoiceStore } from '@/stores/voiceStore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { apiClient } from '@/lib/api-client';

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
    setUsers,
    isConnecting,
    setError,
  } = useVoiceStore();
  const { joinVoiceChannel } = useSocket();

  const [loading, setLoading] = useState(false);

  // If already in this channel, don't show join button
  if (isConnected && currentChannelId === channelId) {
    return null;
  }

  const handleJoin = async () => {
    if (!user || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.joinVoiceChannel(channelId);

      if (response.success && response.data) {
        const { sessionId } = response.data;

        // Connect to voice store
        connectToChannel(channelId, serverId, sessionId);

        // Notify via socket
        joinVoiceChannel(channelId, sessionId);

        // Fetch current users in channel
        const usersResponse = await apiClient.getVoiceChannelUsers(channelId);
        if (usersResponse.success && usersResponse.data) {
          const usersArray = Array.isArray(usersResponse.data)
            ? usersResponse.data
            : (usersResponse.data as { users?: unknown[] }).users || [];

          // Map to VoiceUser format
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
