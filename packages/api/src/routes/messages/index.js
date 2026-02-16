import { z } from 'zod';
import { validateBody } from '../../middleware/validation.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { successResponse } from '../../utils/errors';
import { messageService } from '../../services/message/message.service';
import { VALIDATION } from '@freedomtalk/shared';
const createMessageWithEmbedsSchema = z.object({
    content: z.string().min(1).max(2000),
    channelId: z.string().min(20).max(20).optional(),
    embeds: z.array(z.any()).max(VALIDATION.EMBED.MAX_PER_MESSAGE).optional(),
});
export default async function messageRoutes(app) {
    app.addHook('onRequest', requireAuth);
    app.post('/', {
        schema: {
            description: 'Create a new message with optional embeds',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string', minLength: 1, maxLength: 2000 },
                    channelId: { type: 'string', minLength: 20, maxLength: 20 },
                    embeds: {
                        type: 'array',
                        maxItems: VALIDATION.EMBED.MAX_PER_MESSAGE,
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['rich', 'image', 'video', 'link', 'article'] },
                                title: { type: 'string', maxLength: VALIDATION.EMBED.MAX_TITLE_LENGTH },
                                description: { type: 'string', maxLength: VALIDATION.EMBED.MAX_DESCRIPTION_LENGTH },
                                url: { type: 'string', maxLength: 2048 },
                                timestamp: { type: 'string', format: 'date-time' },
                                color: { type: 'integer', minimum: 0, maximum: 16777215 },
                                footer_text: { type: 'string', maxLength: VALIDATION.EMBED.MAX_FOOTER_LENGTH },
                                footer_icon_url: { type: 'string', maxLength: 500 },
                                image_url: { type: 'string', maxLength: 500 },
                                thumbnail_url: { type: 'string', maxLength: 500 },
                                author_name: { type: 'string', maxLength: VALIDATION.EMBED.MAX_AUTHOR_NAME_LENGTH },
                                author_url: { type: 'string', maxLength: 500 },
                                author_icon_url: { type: 'string', maxLength: 500 },
                                fields: {
                                    type: 'array',
                                    maxItems: VALIDATION.EMBED.MAX_FIELDS,
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string', maxLength: VALIDATION.EMBED.MAX_FIELD_NAME_LENGTH },
                                            value: { type: 'string', maxLength: VALIDATION.EMBED.MAX_FIELD_VALUE_LENGTH },
                                            inline: { type: 'boolean' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            response: {
                201: {
                    description: 'Message created successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                content: { type: 'string' },
                                author_id: { type: 'string' },
                                channel_id: { type: 'string', nullable: true },
                                is_edited: { type: 'boolean' },
                                edited_at: { type: 'string', nullable: true },
                                is_deleted: { type: 'boolean' },
                                deleted_at: { type: 'string', nullable: true },
                                is_pinned: { type: 'boolean' },
                                created_at: { type: 'string' },
                                updated_at: { type: 'string' },
                                embeds: {
                                    type: 'array',
                                    items: { type: 'object' },
                                },
                            },
                        },
                    },
                },
            },
        },
        preHandler: validateBody(createMessageWithEmbedsSchema),
    }, async (request, reply) => {
        const { content, channelId, embeds } = request.body;
        const userId = request.user.userId;
        const message = await messageService.createMessage({
            content,
            authorId: userId,
            channelId,
            embeds,
        });
        return reply.code(201).send(successResponse(message));
    });
    app.get('/:id', {
        schema: {
            description: 'Get a message by ID',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: {
                    description: 'Message retrieved successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const message = await messageService.getMessage(id);
        return reply.send(successResponse(message));
    });
    app.get('/', {
        schema: {
            description: 'Get messages with pagination and filtering',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    before: { type: 'string' },
                    after: { type: 'string' },
                    limit: { type: 'integer', minimum: 1, maximum: 100 },
                    authorId: { type: 'string' },
                    channelId: { type: 'string' },
                    isPinned: { type: 'boolean' },
                    search: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                },
            },
            response: {
                200: {
                    description: 'Messages retrieved successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { before, after, limit, authorId, channelId, isPinned, search, startDate, endDate } = request.query;
        const result = await messageService.getMessages({ before, after, limit: limit ? parseInt(limit, 10) : undefined }, {
            authorId,
            channelId,
            isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
            search,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
        return reply.send(successResponse(result));
    });
    app.patch('/:id', {
        schema: {
            description: 'Update a message',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            body: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string', minLength: 1, maxLength: 2000 },
                },
            },
            response: {
                200: {
                    description: 'Message updated successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const { content } = request.body;
        const userId = request.user.userId;
        const message = await messageService.updateMessage(id, content, userId);
        return reply.send(successResponse(message));
    });
    app.delete('/:id', {
        schema: {
            description: 'Soft delete a message',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    hard: { type: 'boolean', description: 'Permanently delete the message' },
                },
            },
            response: {
                204: {
                    description: 'Message deleted successfully',
                    type: 'null',
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const { hard } = request.query;
        const userId = request.user.userId;
        if (hard) {
            await messageService.hardDeleteMessage(id);
        }
        else {
            await messageService.softDeleteMessage(id, userId);
        }
        return reply.code(204).send();
    });
    app.get('/:id/history', {
        schema: {
            description: 'Get message edit history',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: {
                    description: 'Message history retrieved successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const history = await messageService.getMessageHistory(id);
        return reply.send(successResponse(history));
    });
    app.post('/:id/pin', {
        schema: {
            description: 'Pin a message',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: {
                    description: 'Message pinned successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const message = await messageService.pinMessage(id);
        return reply.send(successResponse(message));
    });
    app.delete('/:id/pin', {
        schema: {
            description: 'Unpin a message',
            tags: ['Messages'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: {
                    description: 'Message unpinned successfully',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const message = await messageService.unpinMessage(id);
        return reply.send(successResponse(message));
    });
}
//# sourceMappingURL=index.js.map