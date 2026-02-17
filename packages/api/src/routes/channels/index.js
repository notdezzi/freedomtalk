import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { channelService } from '../../services/channel/channel.service';
import { categoryService } from '../../services/channel/category.service';
import { serverService } from '../../services/server/server.service';
import { roleService } from '../../services/server/role.service';
import { VALIDATION, PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';
const createChannelSchema = z.object({
    name: z.string().min(VALIDATION.CHANNEL_NAME.MIN_LENGTH).max(VALIDATION.CHANNEL_NAME.MAX_LENGTH),
    type: z.enum(['text', 'voice', 'announcement']),
    categoryId: z.string().length(20).optional(),
    topic: z.string().max(VALIDATION.CHANNEL_TOPIC.MAX_LENGTH).optional(),
    position: z.number().int().min(0).optional(),
    nsfw: z.boolean().optional(),
    rateLimitPerUser: z.number().int().min(0).max(21600).optional(),
    bitrate: z.number().int().min(VALIDATION.VOICE.MIN_BITRATE).max(VALIDATION.VOICE.MAX_BITRATE).optional(),
    userLimit: z.number().int().min(0).max(VALIDATION.VOICE.MAX_USER_LIMIT).optional(),
    rtcRegion: z.string().max(20).optional(),
});
const createCategorySchema = z.object({
    name: z.string().min(VALIDATION.CATEGORY_NAME.MIN_LENGTH).max(VALIDATION.CATEGORY_NAME.MAX_LENGTH),
    position: z.number().int().min(0).optional(),
    nsfw: z.boolean().optional(),
});
const updateCategorySchema = z.object({
    name: z.string().min(VALIDATION.CATEGORY_NAME.MIN_LENGTH).max(VALIDATION.CATEGORY_NAME.MAX_LENGTH).optional(),
    position: z.number().int().min(0).optional(),
    nsfw: z.boolean().optional(),
});
const channelPositionsSchema = z.object({
    positions: z.array(z.object({
        id: z.string().length(20),
        position: z.number().int().min(0),
        categoryId: z.string().length(20).nullable().optional(),
    })),
});
async function checkServerPermission(serverId, userId, permission) {
    const isOwner = await serverService.isOwner(serverId, userId);
    if (isOwner)
        return true;
    const permissions = await roleService.calculateMemberPermissions(serverId, userId);
    return Permissions.has(permissions, permission);
}
export default async function channelRoutes(app) {
    app.addHook('onRequest', requireAuth);
    app.get('/servers/:serverId/channels', {
        schema: {
            description: 'Get all channels for a server',
            tags: ['Channels'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['serverId'],
                properties: {
                    serverId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
    }, async (request, reply) => {
        const { serverId } = request.params;
        const userId = request.user.userId;
        const isMember = await serverService.isMember(serverId, userId);
        if (!isMember) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
        }
        const channels = await channelService.getServerChannels(serverId);
        return reply.send(successResponse(channels));
    });
    app.post('/servers/:serverId/channels', {
        schema: {
            description: 'Create a new channel',
            tags: ['Channels'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['serverId'],
                properties: {
                    serverId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            body: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                    name: { type: 'string', minLength: VALIDATION.CHANNEL_NAME.MIN_LENGTH, maxLength: VALIDATION.CHANNEL_NAME.MAX_LENGTH },
                    type: { type: 'string', enum: ['text', 'voice', 'announcement'] },
                    categoryId: { type: 'string', minLength: 20, maxLength: 20 },
                    topic: { type: 'string', maxLength: VALIDATION.CHANNEL_TOPIC.MAX_LENGTH },
                    position: { type: 'integer', minimum: 0 },
                    nsfw: { type: 'boolean' },
                    rateLimitPerUser: { type: 'integer', minimum: 0, maximum: 21600 },
                    bitrate: { type: 'integer', minimum: VALIDATION.VOICE.MIN_BITRATE, maximum: VALIDATION.VOICE.MAX_BITRATE },
                    userLimit: { type: 'integer', minimum: 0, maximum: VALIDATION.VOICE.MAX_USER_LIMIT },
                    rtcRegion: { type: 'string', maxLength: 20 },
                },
            },
            response: {
                201: { type: 'object' },
            },
        },
        preHandler: validateBody(createChannelSchema),
    }, async (request, reply) => {
        const { serverId } = request.params;
        const userId = request.user.userId;
        const body = request.body;
        const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
        }
        const channel = await channelService.createChannel({
            serverId,
            ...body,
        });
        return reply.code(201).send(successResponse(channel));
    });
    app.patch('/servers/:serverId/channels/positions', {
        schema: {
            description: 'Update channel positions',
            tags: ['Channels'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['serverId'],
                properties: {
                    serverId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            body: {
                type: 'object',
                required: ['positions'],
                properties: {
                    positions: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['id', 'position'],
                            properties: {
                                id: { type: 'string', minLength: 20, maxLength: 20 },
                                position: { type: 'integer', minimum: 0 },
                                categoryId: { type: 'string', minLength: 20, maxLength: 20, nullable: true },
                            },
                        },
                    },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
        preHandler: validateBody(channelPositionsSchema),
    }, async (request, reply) => {
        const { serverId } = request.params;
        const userId = request.user.userId;
        const { positions } = request.body;
        const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
        }
        const channels = await channelService.updateChannelPositions(serverId, positions);
        return reply.send(successResponse(channels));
    });
    app.get('/servers/:serverId/categories', {
        schema: {
            description: 'Get all categories for a server',
            tags: ['Categories'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['serverId'],
                properties: {
                    serverId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
    }, async (request, reply) => {
        const { serverId } = request.params;
        const userId = request.user.userId;
        const isMember = await serverService.isMember(serverId, userId);
        if (!isMember) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
        }
        const categories = await categoryService.getServerCategories(serverId);
        return reply.send(successResponse(categories));
    });
    app.post('/servers/:serverId/categories', {
        schema: {
            description: 'Create a new category',
            tags: ['Categories'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['serverId'],
                properties: {
                    serverId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', minLength: VALIDATION.CATEGORY_NAME.MIN_LENGTH, maxLength: VALIDATION.CATEGORY_NAME.MAX_LENGTH },
                    position: { type: 'integer', minimum: 0 },
                    nsfw: { type: 'boolean' },
                },
            },
            response: {
                201: { type: 'object' },
            },
        },
        preHandler: validateBody(createCategorySchema),
    }, async (request, reply) => {
        const { serverId } = request.params;
        const userId = request.user.userId;
        const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
        }
        const category = await categoryService.createCategory({
            serverId,
            ...request.body,
        });
        return reply.code(201).send(successResponse(category));
    });
    app.patch('/categories/:categoryId', {
        schema: {
            description: 'Update category settings',
            tags: ['Categories'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['categoryId'],
                properties: {
                    categoryId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: VALIDATION.CATEGORY_NAME.MIN_LENGTH, maxLength: VALIDATION.CATEGORY_NAME.MAX_LENGTH },
                    position: { type: 'integer', minimum: 0 },
                    nsfw: { type: 'boolean' },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
        preHandler: validateBody(updateCategorySchema),
    }, async (request, reply) => {
        const { categoryId } = request.params;
        const userId = request.user.userId;
        const category = await categoryService.getCategory(categoryId);
        if (!category) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
        }
        const hasPerms = await checkServerPermission(category.server_id, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
        }
        const updated = await categoryService.updateCategory(categoryId, request.body);
        return reply.send(successResponse(updated));
    });
    app.delete('/categories/:categoryId', {
        schema: {
            description: 'Delete a category (channels are moved to no category)',
            tags: ['Categories'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['categoryId'],
                properties: {
                    categoryId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                204: { type: 'null' },
            },
        },
    }, async (request, reply) => {
        const { categoryId } = request.params;
        const userId = request.user.userId;
        const category = await categoryService.getCategory(categoryId);
        if (!category) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
        }
        const hasPerms = await checkServerPermission(category.server_id, userId, PERMISSION_FLAGS.MANAGE_CHANNELS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage channels' } });
        }
        await categoryService.deleteCategory(categoryId);
        return reply.code(204).send();
    });
}
//# sourceMappingURL=index.js.map