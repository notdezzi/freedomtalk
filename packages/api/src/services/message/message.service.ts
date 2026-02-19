/**
 * Message Service
 *
 * Handles all message-related business logic including:
 * - Creating messages with Snowflake IDs
 * - Retrieving messages with pagination and filtering
 * - Updating messages with edit history tracking
 * - Soft and hard deletion
 * - Message preview generation
 * - Embed and link preview integration
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
import { embedService, EmbedData } from '../embed/embed.service';
import { linkPreviewService } from '../embed/link-preview.service';
import { mentionService, ParsedMention, MentionType } from '../formatting/mention.service';

/**
 * Message interface matching database schema
 */
export interface Message {
  id: string;
  content: string;
  author_id: string;
  channel_id: string | null;
  dm_channel_id: string | null;
  is_edited: boolean;
  edited_at: Date | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Mention data for messages
 */
export interface MentionData {
  mentions: ParsedMention[];
  mentionCounts: Record<MentionType, number>;
  mentionedUserIds: string[];
}

/**
 * Message with embeds response
 */
export interface MessageWithEmbeds extends Message {
  embeds?: EmbedData[];
  mentions?: MentionData;
  parsedContent?: string; // HTML-parsed content for client rendering
}

/**
 * Message history interface
 */
export interface MessageHistory {
  id: string;
  message_id: string;
  content: string;
  edited_by: string;
  edited_at: Date;
  created_at: Date;
}

/**
 * Pagination cursor interface
 */
export interface PaginationCursor {
  before?: string; // Message ID to fetch messages before
  after?: string;  // Message ID to fetch messages after
  limit?: number;  // Number of messages to fetch (default: 50, max: 100)
}

/**
 * Message filter options
 */
export interface MessageFilter {
  authorId?: string;
  channelId?: string;
  dmChannelId?: string;
  isPinned?: boolean;
  search?: string; // Search in message content
  startDate?: Date;
  endDate?: Date;
}

/**
 * Message author info for responses
 */
export interface MessageAuthor {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

/**
 * Message with author info
 */
export interface MessageWithAuthor extends Message {
  author?: MessageAuthor;
}

/**
 * Paginated message response
 */
export interface PaginatedMessages {
  messages: MessageWithAuthor[];
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

/**
 * Message Service Class
 */
class MessageService {
  /**
   * Create a new message
   *
   * @param data - Message creation data
   * @param data.content - Message content (max 2000 characters)
   * @param data.authorId - User ID of the message author
   * @param data.channelId - Optional channel ID (for channel messages)
   * @param data.serverId - Optional server ID (for mention validation)
   * @param data.embeds - Optional array of embed data
   * @returns Created message with embeds and mentions
   * @throws NotFoundError if author doesn't exist
   * @throws ApiError if database operation fails
   */
  async createMessage(data: {
    content: string;
    authorId: string;
    channelId?: string;
    dmChannelId?: string;
    serverId?: string;
    embeds?: EmbedData[];
  }): Promise<MessageWithEmbeds> {
    try {
      // Verify author exists
      const author = await db('users').where({ id: data.authorId }).first();
      if (!author) {
        throw new NotFoundError('Author not found');
      }

      // Parse and validate mentions
      const parsedMentions = mentionService.parseMentions(data.content);
      const mentionCounts = mentionService.countMentions(data.content);

      // Validate mentions if we have channel/server context
      if (parsedMentions.length > 0 && (data.channelId || data.serverId)) {
        const validation = await mentionService.validateMentions(
          parsedMentions,
          data.channelId,
          data.serverId
        );

        if (!validation.valid) {
          logger.warn({ invalidMentions: validation.invalidMentions, errors: validation.errors }, 'Invalid mentions in message');
          // We'll still create the message but log the invalid mentions
          // The client can decide how to handle them
        }
      }

      // Get mentioned user IDs for notifications
      const mentionedUserIds = await mentionService.getMentionedUsers(
        data.content,
        data.channelId,
        data.serverId
      );

      // Generate Snowflake ID for the message
      const messageId = generateSnowflakeId();
      const now = new Date();

      // Create message record and embeds in a transaction
      const message = await db.transaction(async (trx) => {
        // Insert message
        const messageRecord: Partial<Message> = {
          id: messageId,
          content: data.content,
          author_id: data.authorId,
          channel_id: data.channelId || null,
          dm_channel_id: data.dmChannelId || null,
          is_edited: false,
          edited_at: null,
          is_deleted: false,
          deleted_at: null,
          is_pinned: false,
          created_at: now,
          updated_at: now,
        };

        await trx('messages').insert(messageRecord);

        // Create embeds if provided
        let createdEmbeds: EmbedData[] = [];
        if (data.embeds && data.embeds.length > 0) {
          const embeds = await embedService.createEmbeds(messageId, data.embeds);
          // Convert Embed[] to EmbedData[] by removing database-specific fields
          createdEmbeds = embeds.map((e) => ({
            type: e.type,
            title: e.title || undefined,
            description: e.description || undefined,
            url: e.url || undefined,
            timestamp: e.timestamp || undefined,
            color: e.color || undefined,
            footer_text: e.footer_text || undefined,
            footer_icon_url: e.footer_icon_url || undefined,
            image_url: e.image_url || undefined,
            thumbnail_url: e.thumbnail_url || undefined,
            author_name: e.author_name || undefined,
            author_url: e.author_url || undefined,
            author_icon_url: e.author_icon_url || undefined,
            fields: e.fields || undefined,
          }));
        }

        return { message: messageRecord as Message, embeds: createdEmbeds };
      });

      logger.info(`Message created: ${messageId} by user ${data.authorId}, embeds: ${message.embeds?.length || 0}, mentions: ${parsedMentions.length}`);

      // Generate link previews asynchronously if message contains URLs and no embeds provided
      if ((!data.embeds || data.embeds.length === 0) && data.content) {
        this.generateLinkPreviewsAsync(messageId, data.content);
      }

      // Build mention data for response
      const mentionData: MentionData = {
        mentions: parsedMentions,
        mentionCounts,
        mentionedUserIds,
      };

      return { ...message.message, embeds: message.embeds, mentions: mentionData };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error creating message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create message', 500);
    }
  }

  /**
   * Generate link previews asynchronously for URLs in message content
   * This runs in the background and adds embeds to existing messages
   *
   * @param messageId - Message ID to add embeds to
   * @param content - Message content to extract URLs from
   */
  private async generateLinkPreviewsAsync(messageId: string, content: string): Promise<void> {
    // Fire and forget - run asynchronously without blocking response
    setImmediate(async () => {
      try {
        const urls = linkPreviewService.extractUrls(content);

        if (urls.length === 0) {
          return;
        }

        logger.debug({ messageId, urlCount: urls.length }, 'Generating link previews');

        // Generate preview for first URL only (Discord behavior)
        const embed = await linkPreviewService.generatePreview(urls[0]!);

        if (embed) {
          await embedService.createEmbed(messageId, embed);
          logger.info({ messageId, url: urls[0] }, 'Link preview added to message');

          // Broadcast embed update via WebSocket
          const { messageBroadcaster } = await import('../websocket/message.broadcaster');
          const existingMessage = await this.getMessage(messageId);
          const wsMessage = {
            id: existingMessage.id,
            content: existingMessage.content,
            authorId: existingMessage.author_id,
            channelId: existingMessage.channel_id,
            createdAt: existingMessage.created_at.toISOString(),
            updatedAt: existingMessage.updated_at.toISOString(),
            isEdited: existingMessage.is_edited,
            isDeleted: existingMessage.is_deleted,
            embeds: [{
              ...embed,
              timestamp: embed.timestamp instanceof Date ? embed.timestamp.toISOString() : embed.timestamp,
            }],
          };

          // Broadcast as an update so clients see the new embed
          if (existingMessage.channel_id) {
            await messageBroadcaster.broadcastMessageUpdate(wsMessage);
          }
        }
      } catch (error) {
        logger.error({ error, messageId }, 'Error generating link previews');
        // Silently fail - link previews are optional
      }
    });
  }

  /**
   * Get a single message by ID
   *
   * @param id - Message ID
   * @param includeDeleted - Whether to include soft-deleted messages (default: false)
   * @returns Message
   * @throws NotFoundError if message doesn't exist or is deleted
   */
  async getMessage(id: string, includeDeleted = false): Promise<Message> {
    try {
      const query = db('messages').where({ id });

      if (!includeDeleted) {
        query.where({ is_deleted: false });
      }

      const message = await query.first();

      if (!message) {
        throw new NotFoundError('Message');
      }

      return message;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error fetching message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch message', 500);
    }
  }

  /**
   * Get multiple messages with pagination and filtering
   *
   * @param cursor - Pagination cursor (before, after, limit)
   * @param filter - Optional filters (authorId, channelId, isPinned, search, dates)
   * @returns Paginated messages with cursor information
   */
  async getMessages(cursor: PaginationCursor = {}, filter: MessageFilter = {}): Promise<PaginatedMessages> {
    try {
      const limit = Math.min(cursor.limit || 50, 100); // Default 50, max 100

      // Build base query
      let query = db('messages').where('messages.is_deleted', false);

      // Apply filters
      if (filter.authorId) {
        query = query.where('messages.author_id', filter.authorId);
      }

      if (filter.channelId) {
        query = query.where('messages.channel_id', filter.channelId);
      }

      if (filter.dmChannelId) {
        query = query.where('messages.dm_channel_id', filter.dmChannelId);
      }

      if (filter.isPinned !== undefined) {
        query = query.where('messages.is_pinned', filter.isPinned);
      }

      if (filter.search) {
        query = query.where('messages.content', 'ilike', `%${filter.search}%`);
      }

      if (filter.startDate) {
        query = query.where('messages.created_at', '>=', filter.startDate);
      }

      if (filter.endDate) {
        query = query.where('messages.created_at', '<=', filter.endDate);
      }

      // Apply cursor-based pagination
      if (cursor.before) {
        const beforeMessage = await this.getMessage(cursor.before, false);
        query = query.where('messages.created_at', '<', beforeMessage.created_at);
      }

      if (cursor.after) {
        const afterMessage = await this.getMessage(cursor.after, false);
        query = query.where('messages.created_at', '>', afterMessage.created_at);
      }

      // Fetch limit + 1 to determine if there are more messages
      // Join with users and user_profiles to get author info
      const messages = await query
        .leftJoin('users', 'messages.author_id', 'users.id')
        .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
        .select(
          'messages.*',
          'users.username as author_username',
          'user_profiles.display_name as author_display_name',
          'user_profiles.avatar_url as author_avatar'
        )
        .orderBy('messages.created_at', 'desc')
        .limit(limit + 1);

      // Determine if there are more messages
      const hasMore = messages.length > limit;
      const rawMessages = hasMore ? messages.slice(0, limit) : messages;

      // Transform messages to include author data
      const resultMessages: MessageWithAuthor[] = rawMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        author_id: msg.author_id,
        channel_id: msg.channel_id,
        dm_channel_id: msg.dm_channel_id,
        is_edited: msg.is_edited,
        edited_at: msg.edited_at,
        is_deleted: msg.is_deleted,
        deleted_at: msg.deleted_at,
        is_pinned: msg.is_pinned,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        author: msg.author_username ? {
          id: msg.author_id,
          username: msg.author_username,
          displayName: msg.author_display_name || undefined,
          avatar: msg.author_avatar || undefined,
        } : undefined,
      }));

      // Generate cursors
      const nextCursor = hasMore && resultMessages.length > 0
        ? resultMessages[resultMessages.length - 1]?.id
        : undefined;

      const prevCursor = resultMessages.length > 0
        ? resultMessages[0]?.id
        : undefined;

      return {
        messages: resultMessages,
        hasMore,
        nextCursor,
        prevCursor,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error fetching messages');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch messages', 500);
    }
  }

  /**
   * Update a message and track edit history
   *
   * @param id - Message ID
   * @param content - New message content
   * @param editorId - User ID of the editor
   * @param serverId - Optional server ID for mention validation
   * @returns Updated message with mentions
   * @throws NotFoundError if message doesn't exist
   * @throws ConflictError if message is deleted
   * @throws ApiError if database operation fails
   */
  async updateMessage(id: string, content: string, editorId: string, serverId?: string): Promise<MessageWithEmbeds> {
    try {
      // Get existing message (include deleted to check status)
      const existingMessage = await this.getMessage(id, true);

      if (existingMessage.is_deleted) {
        throw new ConflictError('Cannot edit deleted message');
      }

      // Parse and validate mentions in new content
      const parsedMentions = mentionService.parseMentions(content);
      const mentionCounts = mentionService.countMentions(content);

      // Get mentioned user IDs for notifications
      const mentionedUserIds = await mentionService.getMentionedUsers(
        content,
        existingMessage.channel_id || undefined,
        serverId
      );

      // Store previous content in history
      const historyId = generateSnowflakeId();
      const now = new Date();

      const historyRecord: Partial<MessageHistory> = {
        id: historyId,
        message_id: id,
        content: existingMessage.content,
        edited_by: editorId,
        edited_at: now,
        created_at: now,
      };

      await db('message_history').insert(historyRecord);

      // Update message
      await db('messages')
        .where({ id })
        .update({
          content,
          is_edited: true,
          edited_at: now,
          updated_at: now,
        });

      logger.info(`Message updated: ${id} by user ${editorId}, mentions: ${parsedMentions.length}`);

      // Build mention data for response
      const mentionData: MentionData = {
        mentions: parsedMentions,
        mentionCounts,
        mentionedUserIds,
      };

      // Return updated message with mentions
      const updatedMessage = await this.getMessage(id, false);
      return { ...updatedMessage, mentions: mentionData };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error }, 'Error updating message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update message', 500);
    }
  }

  /**
   * Soft delete a message (mark as deleted but keep in database)
   *
   * @param id - Message ID
   * @param deleterId - User ID of the deleter
   * @throws NotFoundError if message doesn't exist
   * @throws ConflictError if message is already deleted
   */
  async softDeleteMessage(id: string, deleterId: string): Promise<void> {
    try {
      const message = await this.getMessage(id, true);

      if (message.is_deleted) {
        throw new ConflictError('Message is already deleted');
      }

      const now = new Date();

      await db('messages')
        .where({ id })
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now,
        });

      logger.info(`Message soft deleted: ${id} by user ${deleterId}`);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error }, 'Error soft deleting message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete message', 500);
    }
  }

  /**
   * Hard delete a message (permanently remove from database)
   * Also deletes all associated history records (CASCADE)
   *
   * @param id - Message ID
   * @throws NotFoundError if message doesn't exist
   */
  async hardDeleteMessage(id: string): Promise<void> {
    try {
      // Verify message exists (include deleted messages)
      await this.getMessage(id, true);

      // Delete message (CASCADE will delete history records)
      const deleted = await db('messages').where({ id }).del();

      if (deleted === 0) {
        throw new NotFoundError('Message');
      }

      logger.info(`Message hard deleted: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error hard deleting message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to permanently delete message', 500);
    }
  }

  /**
   * Get edit history for a message
   *
   * @param messageId - Message ID
   * @returns Array of message history records, ordered by edit time (newest first)
   * @throws NotFoundError if message doesn't exist
   */
  async getMessageHistory(messageId: string): Promise<MessageHistory[]> {
    try {
      // Verify message exists
      await this.getMessage(messageId, true); // Include deleted messages

      // Fetch history records
      const history = await db('message_history')
        .where({ message_id: messageId })
        .orderBy('edited_at', 'desc');

      return history;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error fetching message history');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch message history', 500);
    }
  }

  /**
   * Pin a message
   *
   * @param id - Message ID
   * @returns Updated message
   * @throws NotFoundError if message doesn't exist
   */
  async pinMessage(id: string): Promise<Message> {
    try {
      await this.getMessage(id, false);

      const now = new Date();

      await db('messages')
        .where({ id })
        .update({
          is_pinned: true,
          updated_at: now,
        });

      logger.info(`Message pinned: ${id}`);

      return this.getMessage(id, false);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error pinning message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to pin message', 500);
    }
  }

  /**
   * Unpin a message
   *
   * @param id - Message ID
   * @returns Updated message
   * @throws NotFoundError if message doesn't exist
   */
  async unpinMessage(id: string): Promise<Message> {
    try {
      await this.getMessage(id, false);

      const now = new Date();

      await db('messages')
        .where({ id })
        .update({
          is_pinned: false,
          updated_at: now,
        });

      logger.info(`Message unpinned: ${id}`);

      return this.getMessage(id, false);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error unpinning message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to unpin message', 500);
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();

