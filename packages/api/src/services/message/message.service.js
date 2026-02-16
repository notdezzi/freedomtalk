import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
import { embedService } from '../embed/embed.service';
import { linkPreviewService } from '../embed/link-preview.service';
import { mentionService } from '../formatting/mention.service';
class MessageService {
    async createMessage(data) {
        try {
            const author = await db('users').where({ id: data.authorId }).first();
            if (!author) {
                throw new NotFoundError('Author not found');
            }
            const parsedMentions = mentionService.parseMentions(data.content);
            const mentionCounts = mentionService.countMentions(data.content);
            if (parsedMentions.length > 0 && (data.channelId || data.serverId)) {
                const validation = await mentionService.validateMentions(parsedMentions, data.channelId, data.serverId);
                if (!validation.valid) {
                    logger.warn({ invalidMentions: validation.invalidMentions, errors: validation.errors }, 'Invalid mentions in message');
                }
            }
            const mentionedUserIds = await mentionService.getMentionedUsers(data.content, data.channelId, data.serverId);
            const messageId = generateSnowflakeId();
            const now = new Date();
            const message = await db.transaction(async (trx) => {
                const messageRecord = {
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
                await trx('messages').insert(messageRecord);
                let createdEmbeds = [];
                if (data.embeds && data.embeds.length > 0) {
                    const embeds = await embedService.createEmbeds(messageId, data.embeds);
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
                return { message: messageRecord, embeds: createdEmbeds };
            });
            logger.info(`Message created: ${messageId} by user ${data.authorId}, embeds: ${message.embeds?.length || 0}, mentions: ${parsedMentions.length}`);
            if ((!data.embeds || data.embeds.length === 0) && data.content) {
                this.generateLinkPreviewsAsync(messageId, data.content);
            }
            const mentionData = {
                mentions: parsedMentions,
                mentionCounts,
                mentionedUserIds,
            };
            return { ...message.message, embeds: message.embeds, mentions: mentionData };
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error }, 'Error creating message');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create message', 500);
        }
    }
    async generateLinkPreviewsAsync(messageId, content) {
        setImmediate(async () => {
            try {
                const urls = linkPreviewService.extractUrls(content);
                if (urls.length === 0) {
                    return;
                }
                logger.debug({ messageId, urlCount: urls.length }, 'Generating link previews');
                const embed = await linkPreviewService.generatePreview(urls[0]);
                if (embed) {
                    await embedService.createEmbed(messageId, embed);
                    logger.info({ messageId, url: urls[0] }, 'Link preview added to message');
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
                    if (existingMessage.channel_id) {
                        await messageBroadcaster.broadcastMessageUpdate(wsMessage);
                    }
                }
            }
            catch (error) {
                logger.error({ error, messageId }, 'Error generating link previews');
            }
        });
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
    async updateMessage(id, content, editorId, serverId) {
        try {
            const existingMessage = await this.getMessage(id, true);
            if (existingMessage.is_deleted) {
                throw new ConflictError('Cannot edit deleted message');
            }
            const parsedMentions = mentionService.parseMentions(content);
            const mentionCounts = mentionService.countMentions(content);
            const mentionedUserIds = await mentionService.getMentionedUsers(content, existingMessage.channel_id || undefined, serverId);
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
            logger.info(`Message updated: ${id} by user ${editorId}, mentions: ${parsedMentions.length}`);
            const mentionData = {
                mentions: parsedMentions,
                mentionCounts,
                mentionedUserIds,
            };
            const updatedMessage = await this.getMessage(id, false);
            return { ...updatedMessage, mentions: mentionData };
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