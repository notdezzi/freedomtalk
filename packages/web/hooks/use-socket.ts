import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/lib/socket';
import { useSocketStore, useAuthStore, useTypingStore } from '@/stores';
import { queryKeys } from '@/lib/query-provider';

// Track current server room to avoid duplicate joins
let currentServerRoom: string | null = null;

export function useSocket() {
  const queryClient = useQueryClient();
  const setStatus = useSocketStore((s) => s.setStatus);
  const subscribe = useSocketStore((s) => s.subscribe);
  const unsubscribe = useSocketStore((s) => s.unsubscribe);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setTyping = useTypingStore((s) => s.setTyping);

  // Track if we've setup listeners to prevent duplicates
  const listenersSetupRef = useRef(false);

  // Connect socket on mount when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      // Don't disconnect on unmount, let the service manage connection
    };
  }, [isAuthenticated, user]);

  // Set up socket listeners - only once per socket connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const eventNames = [
      'message:created',
      'message:updated',
      'message:deleted',
      'typing:start',
      'typing:stop',
      'presence:update',
      'server:add',
      'server:remove',
      'server_member:add',
      'server_member:update',
      'server_member:remove',
      'server_ban:add',
      'server_ban:remove',
      'server:update',
      'channel:create',
      'channel:update',
      'channel:delete',
      'dm:create',
      'friend_request:received',
      'friend_request:accepted',
      'friend_request:rejected',
      'friend_request:cancelled',
      'friend:removed',
      'friend_presence:update',
      'reaction:add',
      'reaction:remove',
    ] as const;

    const setupListeners = () => {
      const socket = socketService.getSocket();
      if (!socket || !socket.connected) return false;

      // Check if already setup
      if (socketService.areListenersSetup()) return true;

      // Remove any existing listeners first to prevent duplicates
      eventNames.forEach(eventName => {
        socket.removeAllListeners(eventName);
      });

      // Message events - using correct event names from backend
      socket.on('message:created', (data: any) => {
        console.log('[Socket] New message:', data);
        // Invalidate messages query to refetch
        const channelId = data.channelId || data.channel_id;
        const dmChannelId = data.dmChannelId || data.dm_channel_id;
        if (channelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.channels.messages(channelId)
          });
        }
        if (dmChannelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.dms.messages(dmChannelId)
          });
        }
      });

      socket.on('message:updated', (data: any) => {
        console.log('[Socket] Message updated:', data);
        const channelId = data.channelId || data.channel_id;
        const dmChannelId = data.dmChannelId || data.dm_channel_id;
        if (channelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.channels.messages(channelId)
          });
        }
        if (dmChannelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.dms.messages(dmChannelId)
          });
        }
      });

      socket.on('message:deleted', (data: any) => {
        console.log('[Socket] Message deleted:', data);
        const channelId = data.channelId || data.channel_id;
        const dmChannelId = data.dmChannelId || data.dm_channel_id;
        if (channelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.channels.messages(channelId)
          });
        }
        if (dmChannelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.dms.messages(dmChannelId)
          });
        }
      });

      // Typing events
      socket.on('typing:start', (data: any) => {
        console.log('[Socket] Typing started:', data);
        // Handle both channelId (for server channels) and dmChannelId (for DMs)
        const channelId = data.channelId || data.dmChannelId;
        // Update typing store - don't show current user's typing
        if (data.userId !== user?.id && channelId) {
          setTyping(channelId, data.userId, data.username || 'Someone', true);
        }
      });

      socket.on('typing:stop', (data: any) => {
        console.log('[Socket] Typing stopped:', data);
        // Handle both channelId (for server channels) and dmChannelId (for DMs)
        const channelId = data.channelId || data.dmChannelId;
        if (data.userId !== user?.id && channelId) {
          setTyping(channelId, data.userId, '', false);
        }
      });

      // Presence events
      socket.on('presence:update', (data: any) => {
        console.log('[Socket] Presence update:', data);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
      });

      // Server list events (for the current user)
      socket.on('server:add', (data: any) => {
        console.log('[Socket] Server added to user:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
      });

      socket.on('server:remove', (data: any) => {
        console.log('[Socket] Server removed from user:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.members(data.serverId)
          });
        }
      });

      // Server member events
      socket.on('server_member:add', (data: any) => {
        console.log('[Socket] Member joined server:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.members(data.serverId)
          });
        }
      });

      socket.on('server_member:update', (data: any) => {
        console.log('[Socket] Member updated in server:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.members(data.serverId)
          });
        }
      });

      socket.on('server_member:remove', (data: any) => {
        console.log('[Socket] Member left server:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.members(data.serverId)
          });
        }
      });

      // Server ban events
      socket.on('server_ban:add', (data: any) => {
        console.log('[Socket] User banned from server:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.members(data.serverId)
          });
        }
      });

      socket.on('server_ban:remove', (data: any) => {
        console.log('[Socket] User unbanned from server:', data);
      });

      socket.on('server:update', (data: any) => {
        console.log('[Socket] Server updated:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
      });

      // Channel events
      socket.on('channel:create', (data: any) => {
        console.log('[Socket] Channel created:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.channels(data.serverId)
          });
        }
      });

      socket.on('channel:update', (data: any) => {
        console.log('[Socket] Channel updated:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.channels(data.serverId)
          });
        }
      });

      socket.on('channel:delete', (data: any) => {
        console.log('[Socket] Channel deleted:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.servers.channels(data.serverId)
          });
        }
      });

      // DM events
      socket.on('dm:create', (data: any) => {
        console.log('[Socket] DM created:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.dms.list() });
      });

      // Friend events
      socket.on('friend_request:received', (data: any) => {
        console.log('[Socket] Friend request received:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
      });

      socket.on('friend_request:accepted', (data: any) => {
        console.log('[Socket] Friend request accepted:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
      });

      socket.on('friend_request:rejected', (data: any) => {
        console.log('[Socket] Friend request rejected:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
      });

      socket.on('friend_request:cancelled', (data: any) => {
        console.log('[Socket] Friend request cancelled:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
      });

      socket.on('friend:removed', (data: any) => {
        console.log('[Socket] Friend removed:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
      });

      socket.on('friend_presence:update', (data: any) => {
        console.log('[Socket] Friend presence update:', data);
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.list() });
      });

      // Reaction events
      socket.on('reaction:add', (data: any) => {
        console.log('[Socket] Reaction added:', data);
        if (data.channelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.channels.messages(data.channelId)
          });
        }
      });

      socket.on('reaction:remove', (data: any) => {
        console.log('[Socket] Reaction removed:', data);
        if (data.channelId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.channels.messages(data.channelId)
          });
        }
      });

      // Mark as setup
      socketService.setListenersSetup(true);
      listenersSetupRef.current = true;
      console.log('[Socket] Listeners setup complete');

      return true;
    };

    // Try to setup immediately if connected
    const trySetup = () => {
      if (setupListeners()) {
        // Successfully setup
        return;
      }
      // If not connected yet, the connect/authenticated handlers will setup later
    };

    // Try immediate setup
    trySetup();

    // Also try after a small delay in case socket just connected
    const initialTimeout = setTimeout(trySetup, 500);

    // Listen for connection events to setup listeners (for reconnections)
    const handleConnect = () => {
      // Small delay to ensure socket is fully ready
      setTimeout(() => {
        setupListeners();
      }, 100);
    };

    // Also listen for authenticated event
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('authenticated', handleConnect);
    }

    return () => {
      // Clear initial timeout
      clearTimeout(initialTimeout);

      // Clean up connection listeners
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('authenticated', handleConnect);

        // Clean up all application listeners
        eventNames.forEach(eventName => {
          socket.removeAllListeners(eventName);
        });
      }
      socketService.setListenersSetup(false);
      listenersSetupRef.current = false;
    };
  }, [isAuthenticated, user?.id, queryClient, setTyping]);

  // Join a channel/room
  const joinRoom = useCallback((roomId: string, roomType: 'channel' | 'server' | 'dm' = 'channel') => {
    socketService.joinRoom(roomId, roomType);
    subscribe(roomId);
  }, [subscribe]);

  // Leave a channel/room
  const leaveRoom = useCallback((roomId: string, roomType: 'channel' | 'server' | 'dm' = 'channel') => {
    socketService.leaveRoom(roomId, roomType);
    unsubscribe(roomId);
  }, [unsubscribe]);

  // Join server room (leaves previous server room first)
  const joinServerRoom = useCallback((serverId: string) => {
    // Leave previous server room if different
    if (currentServerRoom && currentServerRoom !== serverId) {
      socketService.leaveRoom(currentServerRoom, 'server');
      unsubscribe(currentServerRoom);
    }
    // Join new server room if not already joined
    if (currentServerRoom !== serverId) {
      socketService.joinRoom(serverId, 'server');
      subscribe(serverId);
      currentServerRoom = serverId;
    }
  }, [subscribe, unsubscribe]);

  // Leave server room
  const leaveServerRoom = useCallback(() => {
    if (currentServerRoom) {
      socketService.leaveRoom(currentServerRoom, 'server');
      unsubscribe(currentServerRoom);
      currentServerRoom = null;
    }
  }, [unsubscribe]);

  // Send typing indicator
  const sendTyping = useCallback((channelId: string) => {
    socketService.sendTyping(channelId);
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((channelId: string) => {
    socketService.stopTyping(channelId);
  }, []);

  return {
    isConnected: socketService.isConnected(),
    joinRoom,
    leaveRoom,
    joinServerRoom,
    leaveServerRoom,
    sendTyping,
    stopTyping,
  };
}
