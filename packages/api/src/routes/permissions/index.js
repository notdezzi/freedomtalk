import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { permissionService } from '../../services/permission/permission.service';
import { channelService } from '../../services/channel/channel.service';
import { serverService } from '../../services/server/server.service';
import { roleService } from '../../services/server/role.service';
import { PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';
const overwriteSchema = z.object({
    allow: z.string().optional(),
    deny: z.string().optional(),
});
const permissionCheckSchema = z.object({
    permissions: z.array(z.string()),
});
async function checkServerPermission(serverId, userId, permission) {
    const isOwner = await serverService.isOwner(serverId, userId);
    if (isOwner)
        return true;
    const permissions = await roleService.calculateMemberPermissions(serverId, userId);
    return Permissions.has(permissions, permission);
}
export default async function permissionRoutes(app) {
    app.addHook('onRequest', requireAuth);
    app.get('/channels/:channelId/permissions', {
        schema: {
            description: 'Get all permission overwrites for a channel',
            tags: ['Permissions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['channelId'],
                properties: {
                    channelId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
    }, async (request, reply) => {
        const { channelId } = request.params;
        const userId = request.user.userId;
        const channel = await channelService.getChannel(channelId);
        if (!channel) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
        }
        const isMember = await serverService.isMember(channel.server_id, userId);
        if (!isMember) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
        }
        const overwrites = await permissionService.getChannelOverwrites(channelId);
        return reply.send(successResponse(overwrites));
    });
    app.put('/channels/:channelId/permissions/:targetId', {
        schema: {
            description: 'Create or update a permission overwrite',
            tags: ['Permissions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['channelId', 'targetId'],
                properties: {
                    channelId: { type: 'string', minLength: 20, maxLength: 20 },
                    targetId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            body: {
                type: 'object',
                properties: {
                    allow: { type: 'string', description: 'Bitwise permission string' },
                    deny: { type: 'string', description: 'Bitwise permission string' },
                    type: { type: 'string', enum: ['role', 'member'] },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
        preHandler: validateBody(overwriteSchema),
    }, async (request, reply) => {
        const { channelId, targetId } = request.params;
        const userId = request.user.userId;
        const body = request.body;
        const channel = await channelService.getChannel(channelId);
        if (!channel) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
        }
        const hasPerms = await checkServerPermission(channel.server_id, userId, PERMISSION_FLAGS.MANAGE_ROLES);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage permissions' } });
        }
        let targetType;
        if (body.type) {
            targetType = body.type;
        }
        else {
            if (targetId === channel.server_id) {
                targetType = 'role';
            }
            else {
                const role = await roleService.getRole(targetId);
                if (role && role.server_id === channel.server_id) {
                    targetType = 'role';
                }
                else {
                    targetType = 'member';
                }
            }
        }
        if (targetType === 'role') {
            const role = await roleService.getRole(targetId);
            if (!role || role.server_id !== channel.server_id) {
                return reply.code(400).send({ success: false, error: { code: 'INVALID_TARGET', message: 'Role not found in this server' } });
            }
        }
        else {
            const isMember = await serverService.isMember(channel.server_id, targetId);
            if (!isMember) {
                return reply.code(400).send({ success: false, error: { code: 'INVALID_TARGET', message: 'User is not a member of this server' } });
            }
        }
        const overwrite = await permissionService.setOverwrite({
            channelId,
            targetId,
            targetType,
            allow: body.allow ? BigInt(body.allow) : undefined,
            deny: body.deny ? BigInt(body.deny) : undefined,
        });
        return reply.send(successResponse(overwrite));
    });
    app.delete('/channels/:channelId/permissions/:targetId', {
        schema: {
            description: 'Delete a permission overwrite',
            tags: ['Permissions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['channelId', 'targetId'],
                properties: {
                    channelId: { type: 'string', minLength: 20, maxLength: 20 },
                    targetId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                204: { type: 'null' },
            },
        },
    }, async (request, reply) => {
        const { channelId, targetId } = request.params;
        const userId = request.user.userId;
        const channel = await channelService.getChannel(channelId);
        if (!channel) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
        }
        const hasPerms = await checkServerPermission(channel.server_id, userId, PERMISSION_FLAGS.MANAGE_ROLES);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage permissions' } });
        }
        await permissionService.deleteOverwrite(channelId, targetId);
        return reply.code(204).send();
    });
    app.get('/channels/:channelId/permissions/@me', {
        schema: {
            description: "Get current user's permissions in a channel",
            tags: ['Permissions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['channelId'],
                properties: {
                    channelId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
    }, async (request, reply) => {
        const { channelId } = request.params;
        const userId = request.user.userId;
        const channel = await channelService.getChannel(channelId);
        if (!channel) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
        }
        const isMember = await serverService.isMember(channel.server_id, userId);
        if (!isMember) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
        }
        const breakdown = await permissionService.getPermissionBreakdown(channel.server_id, channelId, userId);
        return reply.send(successResponse(breakdown));
    });
    app.post('/channels/:channelId/permissions/check', {
        schema: {
            description: 'Check if user has specific permissions',
            tags: ['Permissions'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['channelId'],
                properties: {
                    channelId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            body: {
                type: 'object',
                required: ['permissions'],
                properties: {
                    permissions: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of permission names to check',
                    },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
        preHandler: validateBody(permissionCheckSchema),
    }, async (request, reply) => {
        const { channelId } = request.params;
        const userId = request.user.userId;
        const { permissions: permissionNames } = request.body;
        const channel = await channelService.getChannel(channelId);
        if (!channel) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
        }
        const isMember = await serverService.isMember(channel.server_id, userId);
        if (!isMember) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
        }
        const userPermissions = await permissionService.calculateChannelPermissions(channel.server_id, channelId, userId);
        const results = {};
        for (const name of permissionNames) {
            const flag = PERMISSION_FLAGS[name];
            if (flag) {
                results[name] = Permissions.has(userPermissions, flag);
            }
            else {
                results[name] = false;
            }
        }
        return reply.send(successResponse({
            permissions: userPermissions.toString(),
            results,
        }));
    });
}
//# sourceMappingURL=index.js.map