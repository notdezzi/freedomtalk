import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { socketService } from '@/lib/socket';
import { useSocketStore, useAuthStore, useTypingStore } from '@/stores';
import { queryKeys } from '@/lib/query-provider';
import { transformMessage } from '@/features/channels/api';
import type { Message } from '@/types';

// Track current server room to avoid duplicate joins
let currentServerRoom: string | null = null;

// Shape of a page in the messages infinite query (see features/channels/api.ts)
interface MessagesPage {
  messages: Message[];
  cursor?: string;
  hasMore: boolean;
}

type MessagesCache = InfiniteData<MessagesPage>;

// Build the message-cache query keys affected by a socket payload
function getMessageQueryKeys(channelId?: string | null, dmChannelId?: string | null) {
  const keys: (readonly (string | number)[])[] = [];
  if (channelId) keys.push(queryKeys.channels.messages(channelId));
  if (dmChannelId) keys.push(queryKeys.dms.messages(dmChannelId));
  return keys;
}

// Find a known author object for `authorId` in a cached message list
// (socket message payloads omit the author object)
function findAuthorInCache(cache: MessagesCache, authorId: string): Message['author'] | undefined {
  for (const page of cache.pages) {
    for (const message of page.messages) {
      if (message.author?.id === authorId) {
        return message.author;
      }
    }
  }
  return undefined;
}

// Patch a message's reactions array in place (count/me bookkeeping)
function patchReactions(
  reactions: Message['reactions'] | undefined,
  emojiName: string | null,
  emojiId: string | null,
  add: boolean,
  isMe: boolean
): Message['reactions'] {
  const next = [...(reactions || [])];
  const index = next.findIndex((r) => {
    if (emojiId) return r.emoji?.id === emojiId;
    const name = r.emoji?.name ?? (r as any).emoji_unicode;
    return name === emojiName;
  });

  if (add) {
    if (index >= 0) {
      const existing = next[index];
      next[index] = { ...existing, count: existing.count + 1, me: existing.me || isMe };
    } else {
      next.push({
        emoji: { name: emojiName || emojiId || 'emoji', id: emojiId || undefined },
        count: 1,
        me: isMe,
      });
    }
  } else if (index >= 0) {
    const existing = next[index];
    const count = Math.max(0, existing.count - 1);
    const me = isMe ? false : existing.me;
    if (count === 0) {
      next.splice(index, 1);
    } else {
      next[index] = { ...existing, count, me };
    }
  }

  return next;
}

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

  // Connect socket on mount when authenticated.
  // Key on user ID, not the user object: checkSession() replaces the user
  // object on every /app mount, and re-running connect() on that identity
  // churn tears down a mid-reconnect socket and orphans holders of the old
  // instance (e.g. the VoiceClient singleton — voice:join then vanishes
  // silently after navigating through /invite and back).
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      // Don't disconnect on unmount, let the service manage connection
    };
  }, [isAuthenticated, user?.id]);

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
      'dm:call_started',
      'dm:call_ended',
      'invite:create',
      'invite:delete',
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

      // Message events - surgical cache updates (no full refetch of every page)

      // New message: append to the LAST page of the open channel's cache.
      // Skipped entirely when there is no cache entry (channel not open).
      socket.on('message:created', (data: any) => {
        console.log('[Socket] New message:', data);
        const channelId = data.channelId || data.channel_id;
        const dmChannelId = data.dmChannelId || data.dm_channel_id;
        const keys = getMessageQueryKeys(channelId, dmChannelId);
        if (keys.length === 0) return;

        const incoming = transformMessage(data);

        for (const key of keys) {
          const existing = queryClient.getQueryData<MessagesCache>(key);
          // No cache entry = channel not open; nothing to update
          if (!existing) continue;

          // Dedupe: merge into an existing entry (e.g. the optimistic message
          // echoed back over the socket)
          const alreadyCached = existing.pages.some((page) =>
            page.messages.some((m) => m.id === incoming.id)
          );

          if (alreadyCached) {
            queryClient.setQueryData<MessagesCache>(key, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                pages: prev.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((m) =>
                    m.id === incoming.id
                      ? {
                          ...m,
                          ...incoming,
                          author:
                            incoming.author?.username !== 'Unknown'
                              ? incoming.author
                              : m.author,
                        }
                      : m
                  ),
                })),
              };
            });
            continue;
          }

          // Socket payloads omit the author object - enrich from cached messages
          if (incoming.author?.username === 'Unknown') {
            const knownAuthor = findAuthorInCache(existing, incoming.authorId);
            if (knownAuthor) incoming.author = knownAuthor;
          }

          // Append to the last page (most recent messages). Drop any optimistic
          // stand-in (temp id) from the same author with the same content —
          // the real message supersedes it regardless of arrival order.
          queryClient.setQueryData<MessagesCache>(key, (prev) => {
            if (!prev || prev.pages.length === 0) return prev;
            const pages = [...prev.pages];
            const last = pages.length - 1;
            const filtered = pages[last].messages.filter(
              (m) =>
                !(
                  m.id.startsWith('optimistic-') &&
                  m.authorId === incoming.authorId &&
                  m.content === incoming.content
                )
            );
            pages[last] = {
              ...pages[last],
              messages: [...filtered, incoming],
            };
            return { ...prev, pages };
          });
        }
      });

      // Message edit: patch content/edited fields in place
      socket.on('message:updated', (data: any) => {
        console.log('[Socket] Message updated:', data);
        const channelId = data.channelId || data.channel_id;
        const dmChannelId = data.dmChannelId || data.dm_channel_id;
        const keys = getMessageQueryKeys(channelId, dmChannelId);
        if (keys.length === 0) return;

        const messageId = data.id || data.messageId || data.message_id;
        if (!messageId) return;

        for (const key of keys) {
          const existing = queryClient.getQueryData<MessagesCache>(key);
          if (!existing) continue;

          queryClient.setQueryData<MessagesCache>(key, (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) => {
                  if (m.id !== messageId) return m;
                  return {
                    ...m,
                    content: data.content ?? m.content,
                    editedAt: data.isEdited
                      ? (data.updatedAt || data.editedAt || m.editedAt)
                      : (data.editedAt ?? m.editedAt),
                    editedTimestamp: data.editedTimestamp ?? m.editedTimestamp,
                  };
                }),
              })),
            };
          });
        }
      });

      // Message deletion: remove by id
      socket.on('message:deleted', (data: any) => {
        console.log('[Socket] Message deleted:', data);
        const channelId = data.channelId || data.channel_id;
        const dmChannelId = data.dmChannelId || data.dm_channel_id;
        const messageId = data.id || data.messageId || data.message_id;
        if (!messageId) return;

        // Delete payloads may only carry one of the two id flavors - when
        // neither key is derivable, scan all message caches for the message
        const keys = getMessageQueryKeys(channelId, dmChannelId);
        const targetKeys =
          keys.length > 0
            ? keys
            : queryClient
                .getQueryCache()
                .getAll()
                .filter((query) => {
                  const k = query.queryKey;
                  return (
                    Array.isArray(k) &&
                    (k[0] === 'channels' || k[0] === 'dms') &&
                    k[2] === 'messages'
                  );
                })
                .map((query) => query.queryKey);

        for (const key of targetKeys) {
          const existing = queryClient.getQueryData<MessagesCache>(key);
          if (!existing) continue;
          if (!existing.pages.some((page) => page.messages.some((m) => m.id === messageId))) {
            continue;
          }

          queryClient.setQueryData<MessagesCache>(key, (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                messages: page.messages.filter((m) => m.id !== messageId),
              })),
            };
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

      // DM call events
      socket.on('dm:call_started', (data: any) => {
        console.log('[Socket] DM call started:', data);
        // Could show a notification or toast here
        // For now, just log it - the DM page will handle showing the call UI
      });

      socket.on('dm:call_ended', (data: any) => {
        console.log('[Socket] DM call ended:', data);
        // Could show a notification or update call state
      });

      // Invite events
      socket.on('invite:create', (data: any) => {
        console.log('[Socket] Invite created:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.servers.invites(data.serverId) });
        }
      });

      socket.on('invite:delete', (data: any) => {
        console.log('[Socket] Invite deleted:', data);
        if (data.serverId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.servers.invites(data.serverId) });
        }
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

      // Reaction events - the payload carries messageId/userId/emoji but no
      // channel id, so patch every cached message list that contains it.
      // This also fixes DM reactions, which were previously ignored entirely.
      const handleReactionEvent = (data: any, add: boolean) => {
        const messageId = data.messageId || data.message_id;
        if (!messageId) return;

        const emojiName = data.emojiUnicode || data.emoji_unicode || null;
        const emojiId = data.emojiId || data.emoji_id || null;
        const userId = data.userId || data.user_id;
        const isMe = !!userId && userId === user?.id;

        const messageQueries = queryClient
          .getQueryCache()
          .getAll()
          .filter((query) => {
            const k = query.queryKey;
            return (
              Array.isArray(k) &&
              (k[0] === 'channels' || k[0] === 'dms') &&
              k[2] === 'messages'
            );
          });

        for (const query of messageQueries) {
          const key = query.queryKey;
          const existing = queryClient.getQueryData<MessagesCache>(key);
          if (!existing) continue;

          const containsMessage = existing.pages.some((page) =>
            page.messages.some((m) => m.id === messageId)
          );
          if (!containsMessage) continue;

          queryClient.setQueryData<MessagesCache>(key, (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === messageId
                    ? {
                        ...m,
                        reactions: patchReactions(m.reactions, emojiName, emojiId, add, isMe),
                      }
                    : m
                ),
              })),
            };
          });
        }
      };

      socket.on('reaction:add', (data: any) => {
        console.log('[Socket] Reaction added:', data);
        handleReactionEvent(data, true);
      });

      socket.on('reaction:remove', (data: any) => {
        console.log('[Socket] Reaction removed:', data);
        handleReactionEvent(data, false);
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
