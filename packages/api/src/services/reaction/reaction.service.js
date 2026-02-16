import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
import { VALIDATION } from '@freedomtalk/shared';
class ReactionService {
    async addReaction(messageId, userId, emojiType, emojiId, emojiUnicode) {
        try {
            const message = await db('messages')
                .where({ id: messageId, is_deleted: false })
                .first();
            if (!message) {
                throw new NotFoundError('Message');
            }
            if (emojiType === 'custom' && !emojiId) {
                throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'emoji_id is required for custom emojis', 400);
            }
            if (emojiType === 'unicode' && !emojiUnicode) {
                throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'emoji_unicode is required for unicode emojis', 400);
            }
            const existingReaction = await db('reactions')
                .where({
                message_id: messageId,
                user_id: userId,
                emoji_type: emojiType,
            })
                .where(function () {
                if (emojiType === 'custom') {
                    this.where({ emoji_id: emojiId });
                }
                else {
                    this.where({ emoji_unicode: emojiUnicode });
                }
            })
                .first();
            if (existingReaction) {
                throw new ConflictError('Reaction already exists');
            }
            const reactionCount = await db('reactions')
                .where({ message_id: messageId })
                .countDistinct(db.raw('COALESCE(emoji_id, emoji_unicode)'))
                .first();
            const count = parseInt(String(reactionCount?.count || '0'), 10);
            if (count >= VALIDATION.REACTION.MAX_PER_MESSAGE) {
                throw new ConflictError(`Maximum ${VALIDATION.REACTION.MAX_PER_MESSAGE} unique reactions per message`);
            }
            if (emojiType === 'custom' && emojiId) {
                const customEmoji = await db('custom_emojis').where({ id: emojiId }).first();
                if (!customEmoji) {
                    throw new NotFoundError('Custom emoji');
                }
            }
            const reactionId = generateSnowflakeId();
            const reaction = {
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
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof ApiError) {
                throw error;
            }
            logger.error({ error, messageId, userId }, 'Error adding reaction');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to add reaction', 500);
        }
    }
    async removeReaction(messageId, userId, emojiType, emojiId, emojiUnicode) {
        try {
            const query = db('reactions')
                .where({
                message_id: messageId,
                user_id: userId,
                emoji_type: emojiType,
            });
            if (emojiType === 'custom') {
                query.where({ emoji_id: emojiId });
            }
            else {
                query.where({ emoji_unicode: emojiUnicode });
            }
            const deleted = await query.delete();
            if (deleted === 0) {
                throw new NotFoundError('Reaction');
            }
            logger.info({ messageId, userId, emojiType }, 'Reaction removed');
            return true;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, messageId, userId }, 'Error removing reaction');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove reaction', 500);
        }
    }
    async removeAllReactions(messageId) {
        try {
            const message = await db('messages').where({ id: messageId }).first();
            if (!message) {
                throw new NotFoundError('Message');
            }
            const deleted = await db('reactions').where({ message_id: messageId }).delete();
            logger.info({ messageId, count: deleted }, 'All reactions removed from message');
            return deleted;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, messageId }, 'Error removing all reactions');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove all reactions', 500);
        }
    }
    async removeReactionsByEmoji(messageId, emojiType, emojiId, emojiUnicode) {
        try {
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
            }
            else {
                query.where({ emoji_unicode: emojiUnicode });
            }
            const deleted = await query.delete();
            logger.info({ messageId, emojiType, count: deleted }, 'Reactions removed by emoji');
            return deleted;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, messageId }, 'Error removing reactions by emoji');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove reactions by emoji', 500);
        }
    }
    async getReactionsByMessage(messageId) {
        try {
            const message = await db('messages').where({ id: messageId }).first();
            if (!message) {
                throw new NotFoundError('Message');
            }
            const reactions = await db('reactions')
                .where({ message_id: messageId })
                .orderBy('created_at', 'asc');
            const grouped = new Map();
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
                        me: false,
                    });
                }
                const group = grouped.get(key);
                group.count++;
                group.users.push(reaction.user_id);
            }
            return Array.from(grouped.values());
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, messageId }, 'Error getting reactions by message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to get reactions', 500);
        }
    }
    async getReactionUsers(messageId, emojiType, emojiId, emojiUnicode, limit = 100, offset = 0) {
        try {
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
            }
            else {
                query.where({ emoji_unicode: emojiUnicode });
            }
            const reactions = await query;
            return reactions.map(r => r.user_id);
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, messageId }, 'Error getting reaction users');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to get reaction users', 500);
        }
    }
}
export const reactionService = new ReactionService();
//# sourceMappingURL=reaction.service.js.map