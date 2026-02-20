/**
 * Socket.io Client Service for FreedomTalk
 * Simplified version that works with the new store architecture
 */

import { io, Socket } from 'socket.io-client';
import { useSocketStore } from '@/stores';
import { getStoredAccessToken } from './api-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listenersSetup: boolean = false;
  private presenceInterval: NodeJS.Timeout | null = null;
  private readonly PRESENCE_INTERVAL_MS = 20000; // Send ping every 20 seconds (before 30s TTL expires)

  /**
   * Initialize and connect to WebSocket server
   */
  connect(): void {
    // Check if already connected or connecting
    if (this.socket) {
      if (this.socket.connected) {
        return;
      }
      this.socket.disconnect();
    }

    const token = getStoredAccessToken();
    if (!token) {
      console.warn('[Socket] No access token available');
      useSocketStore.getState().setStatus('disconnected');
      return;
    }

    useSocketStore.getState().setStatus('connecting');

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.listenersSetup = false;
    this.setupEventHandlers();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopPresenceRefresh();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.listenersSetup = false;
    useSocketStore.getState().setStatus('disconnected');
  }

  /**
   * Start periodic presence refresh
   */
  private startPresenceRefresh(): void {
    this.stopPresenceRefresh(); // Clear any existing interval

    this.presenceInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, this.PRESENCE_INTERVAL_MS);
  }

  /**
   * Stop periodic presence refresh
   */
  private stopPresenceRefresh(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  /**
   * Setup all WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      useSocketStore.getState().setStatus('connected');
      // Start presence refresh interval
      this.startPresenceRefresh();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      useSocketStore.getState().setStatus('disconnected');
      this.listenersSetup = false;
      // Stop presence refresh interval
      this.stopPresenceRefresh();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      useSocketStore.getState().setStatus('error');
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('[Socket] Authenticated:', data);
      useSocketStore.getState().setStatus('connected');
      this.listenersSetup = false; // Reset so listeners can be re-attached
    });

    this.socket.on('authentication_error', (error) => {
      console.error('[Socket] Authentication error:', error);
      useSocketStore.getState().setStatus('error');
      this.disconnect();
    });

    // Custom heartbeat - respond to server pings with pong
    this.socket.on('ping', () => {
      if (this.socket?.connected) {
        this.socket.emit('pong');
      }
    });
  }

  /**
   * Check if application listeners have been setup
   */
  areListenersSetup(): boolean {
    return this.listenersSetup;
  }

  /**
   * Mark listeners as setup
   */
  setListenersSetup(value: boolean): void {
    this.listenersSetup = value;
  }

  /**
   * Join a room/channel
   */
  joinRoom(roomId: string, roomType: 'channel' | 'server' | 'dm' = 'channel'): void {
    if (this.socket?.connected) {
      this.socket.emit('room:join', { roomId, roomType });
    }
  }

  /**
   * Leave a room/channel
   */
  leaveRoom(roomId: string, roomType: 'channel' | 'server' | 'dm' = 'channel'): void {
    if (this.socket?.connected) {
      this.socket.emit('room:leave', { roomId, roomType });
    }
  }

  /**
   * Send a message to a channel
   */
  sendMessage(channelId: string, content: string, referencedMessageId?: string, isDM?: boolean): void {
    const data = isDM
      ? { dmChannelId: channelId, content, referencedMessageId }
      : { channelId, content, referencedMessageId };

    if (this.socket?.connected) {
      this.socket.emit('message:create', data);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(channelId: string, channelType: 'channel' | 'dm' = 'channel'): void {
    if (this.socket?.connected) {
      if (channelType === 'dm') {
        this.socket.emit('typing:start', { dmChannelId: channelId });
      } else {
        this.socket.emit('typing:start', { channelId });
      }
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(channelId: string, channelType: 'channel' | 'dm' = 'channel'): void {
    if (this.socket?.connected) {
      if (channelType === 'dm') {
        this.socket.emit('typing:stop', { dmChannelId: channelId });
      } else {
        this.socket.emit('typing:stop', { channelId });
      }
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
