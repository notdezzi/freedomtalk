/**
 * Socket.io Client Service for FreedomTalk
 * Handles WebSocket connection, authentication, and event management
 */

import { io, Socket } from 'socket.io-client';
import { useWebSocketStore, ConnectionStatus } from '@/stores/websocketStore';
import { useMessageStore } from '@/stores/messageStore';
import { useServerStore } from '@/stores/serverStore';
import { useChannelStore } from '@/stores/channelStore';
import { WS_EVENTS } from '@freedomtalk/shared';
import { getStoredAccessToken } from './api-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize and connect to WebSocket server
   */
  connect(): void {
    // Check if already connected or connecting
    if (this.socket) {
      if (this.socket.connected) {
        console.log('[Socket] Already connected');
        return;
      }
      // Socket exists but not connected - disconnect old one first
      this.socket.disconnect();
    }

    const token = getStoredAccessToken();
    if (!token) {
      console.warn('[Socket] No access token available');
      useWebSocketStore.getState().setStatus('error');
      useWebSocketStore.getState().setError('No authentication token');
      return;
    }

    useWebSocketStore.getState().setStatus('connecting');

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.typingTimeouts.clear();

    useWebSocketStore.getState().reset();
  }

  /**
   * Setup all WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));
    this.socket.on('reconnect', this.handleReconnect.bind(this));
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt.bind(this));
    this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));

    // Authentication events
    this.socket.on(WS_EVENTS.AUTHENTICATED, this.handleAuthenticated.bind(this));
    this.socket.on(WS_EVENTS.AUTHENTICATION_ERROR, this.handleAuthenticationError.bind(this));
    this.socket.on(WS_EVENTS.CONNECTION_LIMIT_EXCEEDED, this.handleConnectionLimit.bind(this));
    this.socket.on(WS_EVENTS.ERROR, this.handleError.bind(this));

    // Server ping - respond with pong to keep connection alive
    this.socket.on(WS_EVENTS.PING, () => {
      if (this.socket?.connected) {
        this.socket.emit(WS_EVENTS.PONG, { timestamp: Date.now() });
      }
    });

    // Heartbeat events
    this.socket.on(WS_EVENTS.PONG, this.handlePong.bind(this));

    // Message events
    this.socket.on(WS_EVENTS.MESSAGE_CREATED, this.handleMessageCreated.bind(this));
    this.socket.on(WS_EVENTS.MESSAGE_UPDATED, this.handleMessageUpdated.bind(this));
    this.socket.on(WS_EVENTS.MESSAGE_DELETED, this.handleMessageDeleted.bind(this));

    // Typing events
    this.socket.on(WS_EVENTS.TYPING_START, this.handleTypingStart.bind(this));
    this.socket.on(WS_EVENTS.TYPING_STOP, this.handleTypingStop.bind(this));

    // Presence events
    this.socket.on(WS_EVENTS.PRESENCE_UPDATE, this.handlePresenceUpdate.bind(this));
    this.socket.on(WS_EVENTS.STATUS_CHANGE, this.handleStatusChange.bind(this));

    // Room events
    this.socket.on(WS_EVENTS.ROOM_JOINED, this.handleRoomJoined.bind(this));
    this.socket.on(WS_EVENTS.ROOM_LEFT, this.handleRoomLeft.bind(this));

    // Channel events
    this.socket.on(WS_EVENTS.CHANNEL_CREATE, this.handleChannelCreate.bind(this));
    this.socket.on(WS_EVENTS.CHANNEL_UPDATE, this.handleChannelUpdate.bind(this));
    this.socket.on(WS_EVENTS.CHANNEL_DELETE, this.handleChannelDelete.bind(this));

    // Server events
    this.socket.on(WS_EVENTS.SERVER_CREATE, this.handleServerCreate.bind(this));
    this.socket.on(WS_EVENTS.SERVER_UPDATE, this.handleServerUpdate.bind(this));
    this.socket.on(WS_EVENTS.SERVER_DELETE, this.handleServerDelete.bind(this));

    // Reaction events
    this.socket.on('reaction:added', this.handleReactionAdded.bind(this));
    this.socket.on('reaction:removed', this.handleReactionRemoved.bind(this));
  }

  // Connection handlers
  private handleConnect(): void {
    console.log('[Socket] Connected');
    useWebSocketStore.getState().setReconnectAttempts(0);
    this.startHeartbeat();
  }

  private handleDisconnect(reason: Socket.DisconnectReason): void {
    console.log('[Socket] Disconnected:', reason);
    useWebSocketStore.getState().setStatus('disconnected');
    useWebSocketStore.getState().setSocket(null);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleConnectError(error: Error): void {
    console.error('[Socket] Connection error:', error);
    useWebSocketStore.getState().setStatus('error');
    useWebSocketStore.getState().setError(error.message);
  }

  private handleReconnect(attempt: number): void {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
    useWebSocketStore.getState().setStatus('connected');
    useWebSocketStore.getState().setReconnectAttempts(0);

    // Re-subscribe to rooms
    this.resubscribeAll();
  }

  private handleReconnectAttempt(attempt: number): void {
    console.log('[Socket] Reconnection attempt:', attempt);
    useWebSocketStore.getState().setStatus('reconnecting');
    useWebSocketStore.getState().setReconnectAttempts(attempt);
  }

  private handleReconnectFailed(): void {
    console.error('[Socket] Reconnection failed');
    useWebSocketStore.getState().setStatus('error');
    useWebSocketStore.getState().setError('Failed to reconnect after maximum attempts');
  }

  // Authentication handlers
  private handleAuthenticated(data: { userId: string; timestamp: string }): void {
    console.log('[Socket] Authenticated:', data.userId);
    useWebSocketStore.getState().setStatus('connected');
    useWebSocketStore.getState().setSocket(this.socket);
    useWebSocketStore.getState().setLastConnected(new Date());
    useWebSocketStore.getState().setError(null);

    // Process queued messages
    this.processQueue();
  }

  private handleAuthenticationError(error: { code: string; message: string }): void {
    console.error('[Socket] Authentication error:', error);
    useWebSocketStore.getState().setStatus('error');
    useWebSocketStore.getState().setError(error.message);
    this.disconnect();
  }

  private handleConnectionLimit(data: { code: string; message: string; limit: number; current: number }): void {
    console.error('[Socket] Connection limit exceeded:', data);
    useWebSocketStore.getState().setStatus('error');
    useWebSocketStore.getState().setError(data.message);
    this.disconnect();
  }

  private handleError(error: { code: string; message: string }): void {
    console.error('[Socket] Error:', error);
    useWebSocketStore.getState().setError(error.message);
  }

  // Heartbeat handlers
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit(WS_EVENTS.PING, { timestamp: Date.now() });
      }
    }, 25000); // Every 25 seconds
  }

  private handlePong(data: { timestamp: string }): void {
    // Heartbeat received, connection is alive
  }

  // Message handlers
  private handleMessageCreated(data: unknown): void {
    console.log('[Socket] Message created:', data);
    const message = data as Record<string, unknown>;
    const channelId = message?.channelId as string | undefined;
    if (channelId) {
      // Import the mapper function and use it
      const { useMessageStore } = require('@/stores/messageStore');
      // The message from socket has author data, map it properly
      const mappedMessage = {
        id: message.id as string,
        channelId: channelId,
        authorId: message.authorId as string,
        author: message.author ? {
          id: (message.author as Record<string, unknown>).id as string,
          username: (message.author as Record<string, unknown>).username as string || 'Unknown User',
          displayName: (message.author as Record<string, unknown>).displayName as string | undefined,
          avatar: (message.author as Record<string, unknown>).avatar as string | undefined,
        } : {
          id: message.authorId as string,
          username: 'Unknown User',
        },
        content: message.content as string,
        editedAt: message.editedAt as string | undefined,
        editedTimestamp: message.editedAt as string | undefined,
        mentionEveryone: false,
        mentions: [],
        mentionRoles: [],
        attachments: [],
        embeds: (message.embeds as unknown[]) || [],
        reactions: [],
        pinned: false,
        type: 'DEFAULT' as const,
        createdAt: message.createdAt as string,
      };
      useMessageStore.getState().addMessage(channelId, mappedMessage);
    }
  }

  private handleMessageUpdated(data: unknown): void {
    console.log('[Socket] Message updated:', data);
    const { channelId, messageId, updates } = data as {
      channelId: string;
      messageId: string;
      updates: Record<string, unknown>;
    };
    if (channelId && messageId) {
      useMessageStore.getState().updateMessage(channelId, messageId, updates);
    }
  }

  private handleMessageDeleted(data: unknown): void {
    console.log('[Socket] Message deleted:', data);
    const { channelId, messageId } = data as { channelId: string; messageId: string };
    if (channelId && messageId) {
      useMessageStore.getState().deleteMessage(channelId, messageId);
    }
  }

  // Typing handlers
  private handleTypingStart(data: unknown): void {
    const { channelId, userId, username } = data as {
      channelId: string;
      userId: string;
      username: string;
    };

    if (channelId && userId) {
      useMessageStore.getState().addTypingUser(channelId, {
        userId,
        username,
        startedAt: Date.now(),
      });

      // Auto-clear typing after 10 seconds
      const key = `${channelId}-${userId}`;
      if (this.typingTimeouts.has(key)) {
        clearTimeout(this.typingTimeouts.get(key)!);
      }

      const timeout = setTimeout(() => {
        useMessageStore.getState().removeTypingUser(channelId, userId);
        this.typingTimeouts.delete(key);
      }, 10000);

      this.typingTimeouts.set(key, timeout);
    }
  }

  private handleTypingStop(data: unknown): void {
    const { channelId, userId } = data as { channelId: string; userId: string };

    if (channelId && userId) {
      useMessageStore.getState().removeTypingUser(channelId, userId);

      const key = `${channelId}-${userId}`;
      if (this.typingTimeouts.has(key)) {
        clearTimeout(this.typingTimeouts.get(key)!);
        this.typingTimeouts.delete(key);
      }
    }
  }

  // Presence handlers
  private handlePresenceUpdate(data: unknown): void {
    console.log('[Socket] Presence update:', data);
    // Handle presence updates (online/offline)
  }

  private handleStatusChange(data: unknown): void {
    console.log('[Socket] Status change:', data);
    // Handle status changes (online/idle/dnd/offline)
  }

  // Room handlers
  private handleRoomJoined(data: unknown): void {
    const { roomId } = data as { roomId: string };
    console.log('[Socket] Joined room:', roomId);
    useWebSocketStore.getState().subscribe(roomId);
  }

  private handleRoomLeft(data: unknown): void {
    const { roomId } = data as { roomId: string };
    console.log('[Socket] Left room:', roomId);
    useWebSocketStore.getState().unsubscribe(roomId);
  }

  // Channel handlers
  private handleChannelCreate(data: unknown): void {
    console.log('[Socket] Channel created:', data);
    // Handle channel creation
  }

  private handleChannelUpdate(data: unknown): void {
    console.log('[Socket] Channel updated:', data);
    // Handle channel update
  }

  private handleChannelDelete(data: unknown): void {
    console.log('[Socket] Channel deleted:', data);
    // Handle channel deletion
  }

  // Server handlers
  private handleServerCreate(data: unknown): void {
    console.log('[Socket] Server created:', data);
    // Handle server creation
  }

  private handleServerUpdate(data: unknown): void {
    console.log('[Socket] Server updated:', data);
    // Handle server update
  }

  private handleServerDelete(data: unknown): void {
    console.log('[Socket] Server deleted:', data);
    // Handle server deletion
  }

  // Reaction handlers
  private handleReactionAdded(data: unknown): void {
    console.log('[Socket] Reaction added:', data);
    const { channelId, messageId, emoji, userId, username } = data as {
      channelId: string;
      messageId: string;
      emoji: { id?: string; name: string };
      userId: string;
      username?: string;
    };

    if (channelId && messageId && emoji) {
      useMessageStore.getState().addReaction(channelId, messageId, emoji, userId);
    }
  }

  private handleReactionRemoved(data: unknown): void {
    console.log('[Socket] Reaction removed:', data);
    const { channelId, messageId, emoji, userId } = data as {
      channelId: string;
      messageId: string;
      emoji: { id?: string; name: string };
      userId: string;
    };

    if (channelId && messageId && emoji) {
      useMessageStore.getState().removeReaction(channelId, messageId, emoji, userId);
    }
  }

  // Queue processing
  private processQueue(): void {
    const queuedMessages = useWebSocketStore.getState().processQueue();

    queuedMessages.forEach((msg) => {
      if (this.socket?.connected) {
        this.socket.emit(msg.event, msg.data);
        useWebSocketStore.getState().removeQueuedMessage(msg.id);
      }
    });
  }

  // Resubscribe to all rooms after reconnection
  private resubscribeAll(): void {
    const { subscriptions } = useWebSocketStore.getState();

    subscriptions.forEach((roomId) => {
      this.joinRoom(roomId);
    });
  }

  // Public methods

  /**
   * Join a room/channel
   */
  joinRoom(roomId: string, roomType: 'channel' | 'server' | 'dm' = 'channel'): void {
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.ROOM_JOIN, { roomId, roomType });
    } else {
      console.warn('[Socket] Cannot join room: not connected');
    }
  }

  /**
   * Leave a room/channel
   */
  leaveRoom(roomId: string, roomType: 'channel' | 'server' | 'dm' = 'channel'): void {
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.ROOM_LEAVE, { roomId, roomType });
    }
  }

  /**
   * Send a message
   */
  sendMessage(channelId: string, content: string, referencedMessageId?: string): void {
    const data = {
      channelId,
      content,
      referencedMessageId,
    };

    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.MESSAGE_CREATE, data);
    } else {
      // Queue message for later
      useWebSocketStore.getState().queueMessage(WS_EVENTS.MESSAGE_CREATE, data);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(channelId: string): void {
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.TYPING_START, { channelId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(channelId: string): void {
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.TYPING_STOP, { channelId });
    }
  }

  /**
   * Add a reaction to a message
   */
  addReaction(channelId: string, messageId: string, emoji: string): void {
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.REACTION_ADD, { channelId, messageId, emoji });
    }
  }

  /**
   * Remove a reaction from a message
   */
  removeReaction(channelId: string, messageId: string, emoji: string): void {
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.REACTION_REMOVE, { channelId, messageId, emoji });
    }
  }

  /**
   * Update user status
   */
  updateStatus(status: 'online' | 'idle' | 'dnd' | 'invisible'): void {
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.STATUS_CHANGE, { status });
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
