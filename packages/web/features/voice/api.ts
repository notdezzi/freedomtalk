import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useVoiceStore } from '@/stores';

// Join a voice channel
export function useJoinVoiceChannel() {
  const setConnected = useVoiceStore((s) => s.setConnected);
  const setConnecting = useVoiceStore((s) => s.setConnecting);
  const setError = useVoiceStore((s) => s.setError);

  return useMutation({
    mutationFn: async ({ channelId, serverId }: { channelId: string; serverId?: string }) => {
      setConnecting(true);
      const response = await apiClient.joinVoiceChannel(channelId);
      return { ...response.data, channelId, serverId };
    },
    onSuccess: (data) => {
      setConnected(true, data.channelId, data.serverId, data.sessionId);
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to join voice channel');
    },
  });
}

// Leave a voice channel
export function useLeaveVoiceChannel() {
  const disconnect = useVoiceStore((s) => s.disconnect);
  const setError = useVoiceStore((s) => s.setError);

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await apiClient.leaveVoiceChannel(channelId);
      return response.data;
    },
    onSuccess: () => {
      disconnect();
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to leave voice channel');
    },
  });
}

// Update voice state (mute, deafen, etc.)
export function useUpdateVoiceState() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      state,
    }: {
      sessionId: string;
      state: { selfMute?: boolean; selfDeaf?: boolean; selfVideo?: boolean; selfStream?: boolean };
    }) => {
      const response = await apiClient.updateVoiceState(sessionId, state);
      return response.data;
    },
  });
}

// Move to another voice channel (not currently supported)
// export function useMoveVoiceChannel() {
//   return useMutation({
//     mutationFn: async ({
//       sessionId,
//       targetChannelId,
//     }: {
//       sessionId: string;
//       targetChannelId: string;
//     }) => {
//       const response = await apiClient.moveVoiceChannel(sessionId, targetChannelId);
//       return response.data;
//     },
//   });
// }
