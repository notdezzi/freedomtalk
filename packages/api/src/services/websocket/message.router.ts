import { logger } from '../../config/logger';
import { db } from '../../config/database';
import { messageBroadcaster } from './message.broadcaster';
import { subscriptionManager } from './subscription.manager';
import { dmChannelService } from '../dm/dm-channel.service';

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
   * Queries dm_channel_participants to get all active participants
   * and broadcasts to each participant's sockets
   * @param message - Message object
   */
  async routeDM(message: Message): Promise<void> {
    try {
      // For DM messages, channelId contains the DM channel ID
      // We need to query the dm_channel_participants table to find all recipients
      if (!message.channelId) {
        logger.warn({ messageId: message.id }, 'DM message has no channelId');
        return;
      }

      // Get all active participants in the DM channel
      const participantIds = await dmChannelService.getParticipantUserIds(message.channelId);

      if (participantIds.length === 0) {
        logger.warn({ messageId: message.id, dmChannelId: message.channelId }, 'No active participants found for DM');
        return;
      }

      logger.info({
        messageId: message.id,
        dmChannelId: message.channelId,
        participantCount: participantIds.length,
      }, 'Routing DM message to participants');

      // Broadcast to each participant
      const broadcastPromises = participantIds.map((userId) =>
        messageBroadcaster.broadcastToUser(userId, 'message:created', message)
      );

      await Promise.all(broadcastPromises);

      logger.debug({
        messageId: message.id,
        dmChannelId: message.channelId,
        participants: participantIds,
      }, 'DM message routed successfully');
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

