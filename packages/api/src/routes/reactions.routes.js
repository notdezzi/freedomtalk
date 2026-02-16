import { z } from 'zod';
import { validateParams, validateQuery } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { successResponse } from '../utils/errors';
import { reactionService } from '../services/reaction/reaction.service';
import { ApiError, ApiErrorCode } from '../types/api.types';
import { logger } from '../config/logger';
const messageIdParamSchema = z.object({
    messageId: z.string().length(20, 'Invalid message ID'),
});
const emojiParamSchema = z.object({
    messageId: z.string().length(20, 'Invalid message ID'),
    emoji: z.string().min(1).max(100, 'Invalid emoji'),
});
const paginationQuerySchema = z.object({
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().min(1).max(100).optional()),
    offset: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().min(0).optional()),
});
function parseEmoji(emoji) {
    const parts = emoji.split(':');
    if (parts.length !== 2) {
        throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Invalid emoji format. Use "unicode:😀" or "custom:emojiId"', 400);
    }
    const [type, value] = parts;
    if (type !== 'unicode' && type !== 'custom') {
        throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Emoji type must be "unicode" or "custom"', 400);
    }
    if (type === 'custom') {
        if (!value || value.length !== 20) {
            throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Custom emoji ID must be 20 characters', 400);
        }
        return { type: 'custom', id: value };
    }
    else {
        if (!value) {
            throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Unicode emoji value is required', 400);
        }
        return { type: 'unicode', unicode: value };
    }
}
export default async function reactionRoutes(app) {
    app.addHook('onRequest', requireAuth);
    app.put('/:messageId/reactions/:emoji', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '10 seconds',
            },
        },
        schema: {
            description: 'Add a reaction to a message',
            tags: ['Reactions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['messageId', 'emoji'],
                properties: {
                    messageId: { type: 'string', minLength: 20, maxLength: 20 },
                    emoji: { type: 'string', minLength: 1, maxLength: 100 },
                },
            },
            response: {
                200: {
                    description: 'Reaction added successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                message_id: { type: 'string' },
                                user_id: { type: 'string' },
                                emoji_type: { type: 'string', enum: ['unicode', 'custom'] },
                                emoji_id: { type: 'string', nullable: true },
                                emoji_unicode: { type: 'string', nullable: true },
                                created_at: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                },
                400: { description: 'Invalid emoji format or validation error' },
                401: { description: 'Unauthorized' },
                404: { description: 'Message not found' },
                409: { description: 'Reaction already exists or limit exceeded' },
                429: { description: 'Rate limit exceeded' },
            },
        },
        preHandler: [validateParams(emojiParamSchema)],
    }, async (request, reply) => {
        const { messageId, emoji } = request.params;
        const userId = request.user.userId;
        const parsed = parseEmoji(emoji);
        const reaction = await reactionService.addReaction(messageId, userId, parsed.type, parsed.id, parsed.unicode);
        logger.info({ messageId, userId, emoji }, 'Reaction added via API');
        reply.send(successResponse(reaction));
    });
    app.delete('/:messageId/reactions/:emoji/@me', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '10 seconds',
            },
        },
        schema: {
            description: 'Remove own reaction from a message',
            tags: ['Reactions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['messageId', 'emoji'],
                properties: {
                    messageId: { type: 'string', minLength: 20, maxLength: 20 },
                    emoji: { type: 'string', minLength: 1, maxLength: 100 },
                },
            },
        },
        preHandler: [validateParams(emojiParamSchema)],
    }, async (request, reply) => {
        const { messageId, emoji } = request.params;
        const userId = request.user.userId;
        const parsed = parseEmoji(emoji);
        await reactionService.removeReaction(messageId, userId, parsed.type, parsed.id, parsed.unicode);
        logger.info({ messageId, userId, emoji }, 'Reaction removed via API');
        reply.status(204).send();
    });
    app.delete('/:messageId/reactions/:emoji', {
        schema: {
            description: 'Remove all reactions of a specific emoji (requires permission)',
            tags: ['Reactions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['messageId', 'emoji'],
                properties: {
                    messageId: { type: 'string', minLength: 20, maxLength: 20 },
                    emoji: { type: 'string', minLength: 1, maxLength: 100 },
                },
            },
            response: {
                200: {
                    description: 'Reactions removed successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                count: { type: 'number' },
                            },
                        },
                    },
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Forbidden - requires message author or admin permission' },
                404: { description: 'Message not found' },
            },
        },
        preHandler: [validateParams(emojiParamSchema)],
    }, async (request, reply) => {
        const { messageId, emoji } = request.params;
        const userId = request.user.userId;
        const parsed = parseEmoji(emoji);
        const count = await reactionService.removeReactionsByEmoji(messageId, parsed.type, parsed.id, parsed.unicode);
        logger.info({ messageId, userId, emoji, count }, 'Reactions removed by emoji via API');
        reply.send(successResponse({ count }));
    });
    app.delete('/:messageId/reactions', {
        schema: {
            description: 'Remove all reactions from a message (requires permission)',
            tags: ['Reactions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['messageId'],
                properties: {
                    messageId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: {
                    description: 'All reactions removed successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                count: { type: 'number' },
                            },
                        },
                    },
                },
                401: { description: 'Unauthorized' },
                403: { description: 'Forbidden - requires message author or admin permission' },
                404: { description: 'Message not found' },
            },
        },
        preHandler: [validateParams(messageIdParamSchema)],
    }, async (request, reply) => {
        const { messageId } = request.params;
        const userId = request.user.userId;
        const count = await reactionService.removeAllReactions(messageId);
        logger.info({ messageId, userId, count }, 'All reactions removed via API');
        reply.send(successResponse({ count }));
    });
    app.get('/:messageId/reactions/:emoji', {
        schema: {
            description: 'Get users who reacted with a specific emoji',
            tags: ['Reactions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['messageId', 'emoji'],
                properties: {
                    messageId: { type: 'string', minLength: 20, maxLength: 20 },
                    emoji: { type: 'string', minLength: 1, maxLength: 100 },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'string', pattern: '^\\d+$' },
                    offset: { type: 'string', pattern: '^\\d+$' },
                },
            },
            response: {
                200: {
                    description: 'Users retrieved successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                users: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                                limit: { type: 'number' },
                                offset: { type: 'number' },
                            },
                        },
                    },
                },
                400: { description: 'Invalid emoji format or pagination parameters' },
                401: { description: 'Unauthorized' },
                404: { description: 'Message not found' },
            },
        },
        preHandler: [validateParams(emojiParamSchema), validateQuery(paginationQuerySchema)],
    }, async (request, reply) => {
        const { messageId, emoji } = request.params;
        const { limit = 100, offset = 0 } = request.query;
        const parsed = parseEmoji(emoji);
        const users = await reactionService.getReactionUsers(messageId, parsed.type, parsed.id, parsed.unicode, limit, offset);
        reply.send(successResponse({ users, limit, offset }));
    });
    app.get('/:messageId/reactions', {
        schema: {
            description: 'Get all reactions for a message',
            tags: ['Reactions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['messageId'],
                properties: {
                    messageId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: {
                    description: 'Reactions retrieved successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    emoji_type: { type: 'string', enum: ['unicode', 'custom'] },
                                    emoji_id: { type: 'string', nullable: true },
                                    emoji_unicode: { type: 'string', nullable: true },
                                    count: { type: 'number' },
                                    users: {
                                        type: 'array',
                                        items: { type: 'string' },
                                    },
                                    me: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                401: { description: 'Unauthorized' },
                404: { description: 'Message not found' },
            },
        },
        preHandler: [validateParams(messageIdParamSchema)],
    }, async (request, reply) => {
        const { messageId } = request.params;
        const userId = request.user.userId;
        const reactions = await reactionService.getReactionsByMessage(messageId);
        const reactionsWithMe = reactions.map(reaction => ({
            ...reaction,
            me: reaction.users.includes(userId),
        }));
        reply.send(successResponse(reactionsWithMe));
    });
}
//# sourceMappingURL=reactions.routes.js.map