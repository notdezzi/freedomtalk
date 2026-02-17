import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { useWebSocketStore } from '@/stores/websocketStore';
import { useAuth } from './useAuth';

export function useSocket() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { status, error, reconnectAttempts, lastConnected } = useWebSocketStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect when authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      socketService.connect();
    }

    return () => {
      // Don't disconnect on unmount, let the app handle it
    };
  }, [isAuthenticated, authLoading]);

  // Disconnect when logged out
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      socketService.disconnect();
    }
  }, [isAuthenticated, authLoading]);

  // Send typing indicator with debounce
  const sendTyping = useCallback((channelId: string) => {
    socketService.sendTyping(channelId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(channelId);
    }, 3000);
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((channelId: string) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketService.stopTyping(channelId);
  }, []);

  // Join a channel room
  const joinChannel = useCallback((channelId: string) => {
    socketService.joinRoom(channelId, 'channel');
  }, []);

  // Leave a channel room
  const leaveChannel = useCallback((channelId: string) => {
    socketService.leaveRoom(channelId, 'channel');
  }, []);

  // Send a message
  const sendMessage = useCallback(
    (channelId: string, content: string, referencedMessageId?: string) => {
      socketService.sendMessage(channelId, content, referencedMessageId);
    },
    []
  );

  // Add a reaction
  const addReaction = useCallback((channelId: string, messageId: string, emoji: string) => {
    socketService.addReaction(channelId, messageId, emoji);
  }, []);

  // Remove a reaction
  const removeReaction = useCallback((channelId: string, messageId: string, emoji: string) => {
    socketService.removeReaction(channelId, messageId, emoji);
  }, []);

  // Update status
  const updateStatus = useCallback((status: 'online' | 'idle' | 'dnd' | 'invisible') => {
    socketService.updateStatus(status);
  }, []);

  // Voice methods
  const joinVoiceChannel = useCallback((channelId: string, sessionId: string) => {
    socketService.joinRoom(`voice:${channelId}`, 'channel');
  }, []);

  const leaveVoiceChannel = useCallback((channelId: string) => {
    socketService.leaveRoom(`voice:${channelId}`, 'channel');
  }, []);

  const updateVoiceState = useCallback((state: {
    selfMute?: boolean;
    selfDeaf?: boolean;
    selfVideo?: boolean;
    selfStream?: boolean;
  }) => {
    // Voice state updates are handled via REST API
    // This is just for notifying other users via socket
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    socketService.disconnect();
    socketService.connect();
  }, []);

  return {
    status,
    error,
    reconnectAttempts,
    lastConnected,
    isConnected: status === 'connected',
    sendTyping,
    stopTyping,
    joinChannel,
    leaveChannel,
    sendMessage,
    addReaction,
    removeReaction,
    updateStatus,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceState,
    reconnect,
  };
}
