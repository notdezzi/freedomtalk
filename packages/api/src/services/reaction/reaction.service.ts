/**
 * Reaction Service
 * 
 * Handles all reaction-related business logic including:
 * - Adding reactions to messages (unicode and custom emojis)
 * - Removing reactions
 * - Removing all reactions from a message
 * - Removing specific emoji reactions
 * - Retrieving reactions with user lists
 * - Enforcing reaction limits (max 20 per message)
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
import { VALIDATION } from '@freedomtalk/shared';

/**
 * Reaction interface matching database schema
 */
export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji_type: 'unicode' | 'custom';
  emoji_id: string | null;
  emoji_unicode: string | null;
  created_at: Date;
}

/**
 * Grouped reaction data for display
 */
export interface GroupedReaction {
  emoji_type: 'unicode' | 'custom';
  emoji_id: string | null;
  emoji_unicode: string | null;
  count: number;
  users: string[]; // User IDs who reacted
  me: boolean; // Whether current user reacted (set by caller)
}

/**
 * Reaction Service Class
 */
class ReactionService {
  /**
   * Add a reaction to a message
   *
   * @param messageId - Message ID to react to
   * @param userId - User ID adding the reaction
   * @param emojiType - Type of emoji ('unicode' or 'custom')
   * @param emojiId - Custom emoji ID (required if emojiType is 'custom')
   * @param emojiUnicode - Unicode emoji (required if emojiType is 'unicode')
   * @returns Created reaction
   * @throws NotFoundError if message doesn't exist
   * @throws ConflictError if reaction already exists or limit exceeded
   * @throws ApiError if database operation fails
   */
  async addReaction(
    messageId: string,
    userId: string,
    emojiType: 'unicode' | 'custom',
    emojiId?: string | null,
    emojiUnicode?: string | null
  ): Promise<Reaction> {
    try {
      // Verify message exists and is not deleted
      const message = await db('messages')
        .where({ id: messageId, is_deleted: false })
        .first();
      
      if (!message) {
        throw new NotFoundError('Message');
      }

      // Validate emoji parameters
      if (emojiType === 'custom' && !emojiId) {
        throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'emoji_id is required for custom emojis', 400);
      }
      if (emojiType === 'unicode' && !emojiUnicode) {
        throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'emoji_unicode is required for unicode emojis', 400);
      }

      // Check if reaction already exists (duplicate check)
      const existingReaction = await db('reactions')
        .where({
          message_id: messageId,
          user_id: userId,
          emoji_type: emojiType,
        })
        .where(function() {
          if (emojiType === 'custom') {
            this.where({ emoji_id: emojiId });
          } else {
            this.where({ emoji_unicode: emojiUnicode });
          }
        })
        .first();

      if (existingReaction) {
        throw new ConflictError('Reaction already exists');
      }

      // Check reaction limit (max 20 unique reactions per message)
      const reactionCount = await db('reactions')
        .where({ message_id: messageId })
        .countDistinct(db.raw('COALESCE(emoji_id, emoji_unicode)') as any)
        .first() as { count?: string | number } | undefined;

      const count = parseInt(String(reactionCount?.count || '0'), 10);
      if (count >= VALIDATION.REACTION.MAX_PER_MESSAGE) {
        throw new ConflictError(`Maximum ${VALIDATION.REACTION.MAX_PER_MESSAGE} unique reactions per message`);
      }

      // Validate custom emoji exists if custom type
      if (emojiType === 'custom' && emojiId) {
        const customEmoji = await db('custom_emojis').where({ id: emojiId }).first();
        if (!customEmoji) {
          throw new NotFoundError('Custom emoji');
        }
      }

      // Create reaction
      const reactionId = generateSnowflakeId();
      const reaction: Reaction = {
        id: reactionId,
        message_id: messageId,
        user_id: userId,
        emoji_type: emojiType,
        emoji_id: emojiType === 'custom' ? emojiId || null : null,
        emoji_unicode: emojiType === 'unicode' ? emojiUnicode || null : null,
        created_at: new Date(),
      };

      await db('reactions').insert(reaction);

      logger.info({ reactionId, messageId, userId, emojiType }, 'Reaction added');

      return reaction;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof ApiError) {
        throw error;
      }
      logger.error({ error, messageId, userId }, 'Error adding reaction');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to add reaction', 500);
    }
  }

  /**
   * Remove a reaction from a message
   *
   * @param messageId - Message ID
   * @param userId - User ID removing the reaction
   * @param emojiType - Type of emoji ('unicode' or 'custom')
   * @param emojiId - Custom emoji ID (required if emojiType is 'custom')
   * @param emojiUnicode - Unicode emoji (required if emojiType is 'unicode')
   * @returns True if reaction was removed
   * @throws NotFoundError if reaction doesn't exist
   * @throws ApiError if database operation fails
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emojiType: 'unicode' | 'custom',
    emojiId?: string | null,
    emojiUnicode?: string | null
  ): Promise<boolean> {
    try {
      // Build query to find the reaction
      const query = db('reactions')
        .where({
          message_id: messageId,
          user_id: userId,
          emoji_type: emojiType,
        });

      if (emojiType === 'custom') {
        query.where({ emoji_id: emojiId });
      } else {
        query.where({ emoji_unicode: emojiUnicode });
      }

      const deleted = await query.delete();

      if (deleted === 0) {
        throw new NotFoundError('Reaction');
      }

      logger.info({ messageId, userId, emojiType }, 'Reaction removed');

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, messageId, userId }, 'Error removing reaction');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove reaction', 500);
    }
  }

  /**
   * Remove all reactions from a message
   * Requires permission check (message author or admin) - handled by caller
   *
   * @param messageId - Message ID
   * @returns Number of reactions removed
   * @throws NotFoundError if message doesn't exist
   * @throws ApiError if database operation fails
   */
  async removeAllReactions(messageId: string): Promise<number> {
    try {
      // Verify message exists
      const message = await db('messages').where({ id: messageId }).first();
      if (!message) {
        throw new NotFoundError('Message');
      }

      const deleted = await db('reactions').where({ message_id: messageId }).delete();

      logger.info({ messageId, count: deleted }, 'All reactions removed from message');

      return deleted;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, messageId }, 'Error removing all reactions');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove all reactions', 500);
    }
  }

  /**
   * Remove all reactions of a specific emoji from a message
   * Requires permission check (message author or admin) - handled by caller
   *
   * @param messageId - Message ID
   * @param emojiType - Type of emoji ('unicode' or 'custom')
   * @param emojiId - Custom emoji ID (required if emojiType is 'custom')
   * @param emojiUnicode - Unicode emoji (required if emojiType is 'unicode')
   * @returns Number of reactions removed
   * @throws NotFoundError if message doesn't exist
   * @throws ApiError if database operation fails
   */
  async removeReactionsByEmoji(
    messageId: string,
    emojiType: 'unicode' | 'custom',
    emojiId?: string | null,
    emojiUnicode?: string | null
  ): Promise<number> {
    try {
      // Verify message exists
      const message = await db('messages').where({ id: messageId }).first();
      if (!message) {
        throw new NotFoundError('Message');
      }

      const query = db('reactions')
        .where({
          message_id: messageId,
          emoji_type: emojiType,
        });

      if (emojiType === 'custom') {
        query.where({ emoji_id: emojiId });
      } else {
        query.where({ emoji_unicode: emojiUnicode });
      }

      const deleted = await query.delete();

      logger.info({ messageId, emojiType, count: deleted }, 'Reactions removed by emoji');

      return deleted;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, messageId }, 'Error removing reactions by emoji');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove reactions by emoji', 500);
    }
  }

  /**
   * Get all reactions for a message, grouped by emoji
   *
   * @param messageId - Message ID
   * @returns Array of grouped reactions with counts and user lists
   * @throws NotFoundError if message doesn't exist
   * @throws ApiError if database operation fails
   */
  async getReactionsByMessage(messageId: string): Promise<GroupedReaction[]> {
    try {
      // Verify message exists
      const message = await db('messages').where({ id: messageId }).first();
      if (!message) {
        throw new NotFoundError('Message');
      }

      // Get all reactions for the message
      const reactions = await db('reactions')
        .where({ message_id: messageId })
        .orderBy('created_at', 'asc');

      // Group reactions by emoji
      const grouped = new Map<string, GroupedReaction>();

      for (const reaction of reactions) {
        const key = reaction.emoji_type === 'custom'
          ? `custom:${reaction.emoji_id}`
          : `unicode:${reaction.emoji_unicode}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            emoji_type: reaction.emoji_type,
            emoji_id: reaction.emoji_id,
            emoji_unicode: reaction.emoji_unicode,
            count: 0,
            users: [],
            me: false, // Will be set by caller based on current user
          });
        }

        const group = grouped.get(key)!;
        group.count++;
        group.users.push(reaction.user_id);
      }

      return Array.from(grouped.values());
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, messageId }, 'Error getting reactions by message');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to get reactions', 500);
    }
  }

  /**
   * Get paginated list of users who reacted with a specific emoji
   *
   * @param messageId - Message ID
   * @param emojiType - Type of emoji ('unicode' or 'custom')
   * @param emojiId - Custom emoji ID (required if emojiType is 'custom')
   * @param emojiUnicode - Unicode emoji (required if emojiType is 'unicode')
   * @param limit - Maximum number of users to return (default: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of user IDs
   * @throws NotFoundError if message doesn't exist
   * @throws ApiError if database operation fails
   */
  async getReactionUsers(
    messageId: string,
    emojiType: 'unicode' | 'custom',
    emojiId?: string | null,
    emojiUnicode?: string | null,
    limit = 100,
    offset = 0
  ): Promise<string[]> {
    try {
      // Verify message exists
      const message = await db('messages').where({ id: messageId }).first();
      if (!message) {
        throw new NotFoundError('Message');
      }

      const query = db('reactions')
        .select('user_id')
        .where({
          message_id: messageId,
          emoji_type: emojiType,
        })
        .orderBy('created_at', 'asc')
        .limit(Math.min(limit, 100))
        .offset(offset);

      if (emojiType === 'custom') {
        query.where({ emoji_id: emojiId });
      } else {
        query.where({ emoji_unicode: emojiUnicode });
      }

      const reactions = await query;

      return reactions.map(r => r.user_id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, messageId }, 'Error getting reaction users');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to get reaction users', 500);
    }
  }
}

/**
 * Reaction service singleton
 * Use this instance throughout the application
 */
export const reactionService = new ReactionService();
