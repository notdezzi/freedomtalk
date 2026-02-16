import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
class MessageService {
    async createMessage(data) {
        try {
            const author = await db('users').where({ id: data.authorId }).first();
            if (!author) {
                throw new NotFoundError('Author not found');
            }
            const messageId = generateSnowflakeId();
            const now = new Date();
            const message = {
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
            return message;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error creating message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create message', 500);
        }
    }
    async getMessage(id, includeDeleted = false) {
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
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error fetching message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch message', 500);
        }
    }
    async getMessages(cursor = {}, filter = {}) {
        try {
            const limit = Math.min(cursor.limit || 50, 100);
            let query = db('messages').where({ is_deleted: false });
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
            if (cursor.before) {
                const beforeMessage = await this.getMessage(cursor.before, false);
                query = query.where('created_at', '<', beforeMessage.created_at);
            }
            if (cursor.after) {
                const afterMessage = await this.getMessage(cursor.after, false);
                query = query.where('created_at', '>', afterMessage.created_at);
            }
            const messages = await query
                .orderBy('created_at', 'desc')
                .limit(limit + 1);
            const hasMore = messages.length > limit;
            const resultMessages = hasMore ? messages.slice(0, limit) : messages;
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
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error fetching messages');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch messages', 500);
        }
    }
    async updateMessage(id, content, editorId) {
        try {
            const existingMessage = await this.getMessage(id, true);
            if (existingMessage.is_deleted) {
                throw new ConflictError('Cannot edit deleted message');
            }
            const historyId = generateSnowflakeId();
            const now = new Date();
            const historyRecord = {
                id: historyId,
                message_id: id,
                content: existingMessage.content,
                edited_by: editorId,
                edited_at: now,
                created_at: now,
            };
            await db('message_history').insert(historyRecord);
            await db('messages')
                .where({ id })
                .update({
                content,
                is_edited: true,
                edited_at: now,
                updated_at: now,
            });
            logger.info(`Message updated: ${id} by user ${editorId}`);
            return this.getMessage(id, false);
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }
            logger.error({ error }, 'Error updating message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update message', 500);
        }
    }
    async softDeleteMessage(id, deleterId) {
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
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }
            logger.error({ error }, 'Error soft deleting message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete message', 500);
        }
    }
    async hardDeleteMessage(id) {
        try {
            await this.getMessage(id, true);
            const deleted = await db('messages').where({ id }).del();
            if (deleted === 0) {
                throw new NotFoundError('Message');
            }
            logger.info(`Message hard deleted: ${id}`);
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error hard deleting message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to permanently delete message', 500);
        }
    }
    async getMessageHistory(messageId) {
        try {
            await this.getMessage(messageId, true);
            const history = await db('message_history')
                .where({ message_id: messageId })
                .orderBy('edited_at', 'desc');
            return history;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error fetching message history');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch message history', 500);
        }
    }
    async pinMessage(id) {
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
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error pinning message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to pin message', 500);
        }
    }
    async unpinMessage(id) {
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
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error unpinning message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to unpin message', 500);
        }
    }
}
export const messageService = new MessageService();
//# sourceMappingURL=message.service.js.map