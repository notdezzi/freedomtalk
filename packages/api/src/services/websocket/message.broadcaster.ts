import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';
import { subscriptionManager } from './subscription.manager';
import { connectionManager } from './connection.manager';
import { roomManager, RoomType } from './room.manager';

/**
 * Message interface
 */
interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string | null;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  embeds?: Array<{
    type?: 'rich' | 'image' | 'video' | 'link' | 'article';
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer_text?: string;
    footer_icon_url?: string;
    image_url?: string;
    thumbnail_url?: string;
    author_name?: string;
    author_url?: string;
    author_icon_url?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
}

/**
 * Message Broadcaster class
 * Broadcasts messages to channel/room members
 */
class MessageBroadcaster {
  private readonly DEDUP_TTL = 60; // 60 seconds

  /**
   * Broadcast new message to channel
   * @param message - Message object
   */
  async broadcastMessage(message: Message): Promise<void> {
    try {
      // Check deduplication
      if (await this.isDuplicate(message.id)) {
        logger.debug({ messageId: message.id }, 'Message broadcast deduplicated');
        return;
      }

      // Mark as broadcast
      await this.markBroadcast(message.id);

      // Get channel subscribers
      if (message.channelId) {
        const subscribers = await subscriptionManager.getChannelSubscribers(message.channelId);
        
        // Broadcast to channel room
        const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channelId);
        roomManager.broadcastToRoom(roomName, WS_EVENTS.MESSAGE_CREATED, message);

        logger.info({ 
          messageId: message.id, 
          channelId: message.channelId, 
          subscriberCount: subscribers.size 
        }, 'Message broadcast to channel');
      }
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Error broadcasting message');
      throw error;
    }
  }

  /**
   * Broadcast message update to channel
   * @param message - Updated message object
   */
  async broadcastMessageUpdate(message: Message): Promise<void> {
    try {
      if (message.channelId) {
        const roomName = roomManager.getRoomName(RoomType.CHANNEL, message.channelId);
        roomManager.broadcastToRoom(roomName, WS_EVENTS.MESSAGE_UPDATED, message);

        logger.info({ messageId: message.id, channelId: message.channelId }, 'Message update broadcast');
      }
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Error broadcasting message update');
      throw error;
    }
  }

  /**
   * Broadcast message deletion to channel
   * @param messageId - Message ID
   * @param channelId - Channel ID
   */
  async broadcastMessageDelete(messageId: string, channelId: string): Promise<void> {
    try {
      const roomName = roomManager.getRoomName(RoomType.CHANNEL, channelId);
      roomManager.broadcastToRoom(roomName, WS_EVENTS.MESSAGE_DELETED, {
        id: messageId,
        channelId,
        timestamp: new Date().toISOString(),
      });

      logger.info({ messageId, channelId }, 'Message deletion broadcast');
    } catch (error) {
      logger.error({ error, messageId, channelId }, 'Error broadcasting message deletion');
      throw error;
    }
  }

  /**
   * Broadcast event to all of a user's socket connections
   * @param userId - User ID
   * @param event - Event name
   * @param data - Event data
   */
  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      const socketIds = connectionManager.getUserConnections(userId);
      const io = wsServer.getIO();

      for (const socketId of socketIds) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }

      logger.debug({ userId, event, socketCount: socketIds.length }, 'Broadcast to user');
    } catch (error) {
      logger.error({ error, userId, event }, 'Error broadcasting to user');
    }
  }

  /**
   * Check if message has already been broadcast (deduplication)
   * @param messageId - Message ID
   * @returns True if duplicate
   */
  private async isDuplicate(messageId: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      const key = `broadcast:${messageId}`;
      const exists = await redis.exists(key);
      return exists > 0;
    } catch (error) {
      logger.error({ error, messageId }, 'Error checking broadcast deduplication');
      return false; // On error, allow broadcast
    }
  }

  /**
   * Mark message as broadcast for deduplication
   * @param messageId - Message ID
   */
  private async markBroadcast(messageId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `broadcast:${messageId}`;
      await redis.set(key, '1', { EX: this.DEDUP_TTL });
    } catch (error) {
      logger.error({ error, messageId }, 'Error marking message as broadcast');
    }
  }
}

// Export singleton instance
export const messageBroadcaster = new MessageBroadcaster();

