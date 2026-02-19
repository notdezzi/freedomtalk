import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { useTypingUsers, useTypingStore } from '@/stores';
import { useAuthStore } from '@/stores';

interface UseChannelOptions {
  channelId: string;
  channelType: 'channel' | 'dm';
  enabled?: boolean;
}

/**
 * Hook to manage channel room subscription and typing indicators
 */
export function useChannel({ channelId, channelType, enabled = true }: UseChannelOptions) {
  const typingUsers = useTypingUsers(channelId);
  const clearChannel = useTypingStore((s) => s.clearChannel);
  const currentUser = useAuthStore((s) => s.user);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Join room when component mounts
  useEffect(() => {
    if (!enabled || !channelId) return;

    const roomType = channelType === 'dm' ? 'dm' : 'channel';
    socketService.joinRoom(channelId, roomType);

    return () => {
      // Leave room and clear typing when component unmounts
      socketService.leaveRoom(channelId, roomType);
      clearChannel(channelId);
    };
  }, [channelId, channelType, enabled, clearChannel]);

  // Send typing indicator with debounce
  const sendTyping = useCallback(() => {
    if (!enabled || !channelId) return;

    // Send typing start
    socketService.sendTyping(channelId, channelType);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(channelId, channelType);
    }, 3000);
  }, [channelId, channelType, enabled]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!enabled || !channelId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketService.stopTyping(channelId, channelType);
  }, [channelId, channelType, enabled]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Filter out current user from typing users (just in case)
  const otherTypingUsers = typingUsers.filter(
    (u) => u.userId !== currentUser?.id
  );

  return {
    typingUsers: otherTypingUsers,
    sendTyping,
    stopTyping,
    isConnected: socketService.isConnected(),
  };
}
