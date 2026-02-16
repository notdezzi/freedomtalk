import { logger } from '../../config/logger';
import { db } from '../../config/database';
import { messageBroadcaster } from './message.broadcaster';
import { subscriptionManager } from './subscription.manager';

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
}

/**
 * Message Router class
 * Routes messages based on channel/server membership
 */
class MessageRouter {
  /**
   * Route message to appropriate recipients
   * @param message - Message object
   */
  async routeMessage(message: Message): Promise<void> {
    try {
      // Determine message type and route accordingly
      if (message.channelId) {
        await this.routeChannelMessage(message);
      } else {
        // DM messages (channelId is null)
        await this.routeDM(message);
      }

      logger.debug({ messageId: message.id, channelId: message.channelId }, 'Message routed');
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Error routing message');
      throw error;
    }
  }

  /**
   * Route message to channel members
   * @param message - Message object
   */
  async routeChannelMessage(message: Message): Promise<void> {
    try {
      if (!message.channelId) {
        throw new Error('Channel ID is required for channel messages');
      }

      // Validate sender is subscribed to channel
      const isSubscribed = await subscriptionManager.isSubscribed(message.authorId, message.channelId);
      if (!isSubscribed) {
        logger.warn({ 
          authorId: message.authorId, 
          channelId: message.channelId 
        }, 'Author not subscribed to channel');
        // Still broadcast - subscription might be out of sync
      }

      // Get channel subscribers
      const subscribers = await subscriptionManager.getChannelSubscribers(message.channelId);

      logger.info({ 
        messageId: message.id, 
        channelId: message.channelId, 
        subscriberCount: subscribers.size 
      }, 'Routing channel message');

      // Broadcast to channel
      await messageBroadcaster.broadcastMessage(message);
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Error routing channel message');
      throw error;
    }
  }

  /**
   * Route message to server members
   * Broadcasts message to all members of the server that contains the channel
   * @param message - Message object
   */
  async routeServerMessage(message: Message): Promise<void> {
    try {
      if (!message.channelId) {
        logger.warn({ messageId: message.id }, 'Cannot route server message without channelId');
        return;
      }

      // Get server ID from channel
      const channel = await db('channels')
        .where({ id: message.channelId })
        .select('server_id')
        .first();

      if (!channel) {
        logger.warn({ messageId: message.id, channelId: message.channelId }, 'Channel not found');
        return;
      }

      // Get all channels in the server
      const serverChannels = await db('channels')
        .where({ server_id: channel.server_id })
        .select('id');

      // Broadcast to all channels in the server
      for (const { id } of serverChannels) {
        const subscribers = await subscriptionManager.getChannelSubscribers(id);
        for (const subscriberId of subscribers) {
          await messageBroadcaster.broadcastToUser(subscriberId, 'message:created', message);
        }
      }

      logger.debug({ messageId: message.id, serverId: channel.server_id }, 'Server message routed');
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Error routing server message');
      throw error;
    }
  }

  /**
   * Route direct message to participants
   * Note: DM functionality requires a DM/conversation table to be implemented
   * For now, this broadcasts to the author only
   * @param message - Message object
   */
  async routeDM(message: Message): Promise<void> {
    try {
      // TODO: Implement proper DM routing when DM/conversation tables are added
      // DM routing will require:
      // 1. A conversations/dm_channels table to track DM participants
      // 2. Query to get all participants in the DM
      // 3. Broadcast to all participants

      logger.debug({ messageId: message.id, authorId: message.authorId }, 'DM routing - broadcasting to author only (DM tables not yet implemented)');

      // Placeholder: Broadcast to author only until DM tables are implemented
      await messageBroadcaster.broadcastToUser(message.authorId, 'message:created', message);
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Error routing DM');
      throw error;
    }
  }

  /**
   * Validate user has permission to send message to channel
   * Checks if user is a member of the server that owns the channel
   * @param userId - User ID
   * @param channelId - Channel ID
   * @returns True if user has permission
   */
  async validateChannelPermission(userId: string, channelId: string): Promise<boolean> {
    try {
      // Get channel and server information
      const channel = await db('channels')
        .join('servers', 'channels.server_id', 'servers.id')
        .where('channels.id', channelId)
        .select('servers.id as server_id', 'servers.owner_id')
        .first();

      if (!channel) {
        logger.warn({ userId, channelId }, 'Channel not found');
        return false;
      }

      // Check if user is the server owner
      // In the future, this should also check server_members table
      if (channel.owner_id === userId) {
        return true;
      }

      // TODO: Add server_members table check when implemented
      // For now, only server owners can send messages
      logger.warn({ userId, channelId, serverId: channel.server_id }, 'User is not server owner');
      return false;
    } catch (error) {
      logger.error({ error, userId, channelId }, 'Error validating channel permission');
      return false;
    }
  }
}

// Export singleton instance
export const messageRouter = new MessageRouter();

