/**
 * Message Service
 * 
 * Handles all message-related business logic including:
 * - Creating messages with Snowflake IDs
 * - Retrieving messages with pagination and filtering
 * - Updating messages with edit history tracking
 * - Soft and hard deletion
 * - Message preview generation
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';

/**
 * Message interface matching database schema
 */
export interface Message {
  id: string;
  content: string;
  author_id: string;
  channel_id: string | null;
  is_edited: boolean;
  edited_at: Date | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
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
  isPinned?: boolean;
  search?: string; // Search in message content
  startDate?: Date;
  endDate?: Date;
}

/**
 * Paginated message response
 */
export interface PaginatedMessages {
  messages: Message[];
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
   * @returns Created message
   * @throws NotFoundError if author doesn't exist
   * @throws ApiError if database operation fails
   */
  async createMessage(data: { content: string; authorId: string; channelId?: string }): Promise<Message> {
    try {
      // Verify author exists
      const author = await db('users').where({ id: data.authorId }).first();
      if (!author) {
        throw new NotFoundError('Author not found');
      }

      // Generate Snowflake ID for the message
      const messageId = generateSnowflakeId();
      const now = new Date();

      // Create message record
      const message: Partial<Message> = {
        id: messageId,
        content: data.content,
        author_id: data.authorId,
        channel_id: data.channelId || null,
        is_edited: false,
        edited_at: null,
        is_deleted: false,
        deleted_at: null,
        is_pinned: false,
        created_at: now,
        updated_at: now,
      };

      await db('messages').insert(message);

      logger.info(`Message created: ${messageId} by user ${data.authorId}`);

      return message as Message;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error }, 'Error creating message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create message', 500);
    }
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
      let query = db('messages').where({ is_deleted: false });

      // Apply filters
      if (filter.authorId) {
        query = query.where({ author_id: filter.authorId });
      }

      if (filter.channelId) {
        query = query.where({ channel_id: filter.channelId });
      }

      if (filter.isPinned !== undefined) {
        query = query.where({ is_pinned: filter.isPinned });
      }

      if (filter.search) {
        query = query.where('content', 'ilike', `%${filter.search}%`);
      }

      if (filter.startDate) {
        query = query.where('created_at', '>=', filter.startDate);
      }

      if (filter.endDate) {
        query = query.where('created_at', '<=', filter.endDate);
      }

      // Apply cursor-based pagination
      if (cursor.before) {
        const beforeMessage = await this.getMessage(cursor.before, false);
        query = query.where('created_at', '<', beforeMessage.created_at);
      }

      if (cursor.after) {
        const afterMessage = await this.getMessage(cursor.after, false);
        query = query.where('created_at', '>', afterMessage.created_at);
      }

      // Fetch limit + 1 to determine if there are more messages
      const messages = await query
        .orderBy('created_at', 'desc')
        .limit(limit + 1);

      // Determine if there are more messages
      const hasMore = messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, limit) : messages;

      // Generate cursors
      const nextCursor = hasMore && resultMessages.length > 0
        ? resultMessages[resultMessages.length - 1].id
        : undefined;

      const prevCursor = resultMessages.length > 0
        ? resultMessages[0].id
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
   * @returns Updated message
   * @throws NotFoundError if message doesn't exist
   * @throws ConflictError if message is deleted
   * @throws ApiError if database operation fails
   */
  async updateMessage(id: string, content: string, editorId: string): Promise<Message> {
    try {
      // Get existing message (include deleted to check status)
      const existingMessage = await this.getMessage(id, true);

      if (existingMessage.is_deleted) {
        throw new ConflictError('Cannot edit deleted message');
      }

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

      logger.info(`Message updated: ${id} by user ${editorId}`);

      // Return updated message
      return this.getMessage(id, false);
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

