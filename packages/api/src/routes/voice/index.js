import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { voiceStateService } from '../../services/voice/voice-state.service';
import { channelService } from '../../services/channel/channel.service';
import { serverService } from '../../services/server/server.service';
import { roleService } from '../../services/server/role.service';
import { PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';
const updateStateSchema = z.object({
    selfMute: z.boolean().optional(),
    selfDeaf: z.boolean().optional(),
    selfVideo: z.boolean().optional(),
    selfStream: z.boolean().optional(),
});
const moveUserSchema = z.object({
    targetChannelId: z.string().length(20),
});
async function checkServerPermission(serverId, userId, permission) {
    const isOwner = await serverService.isOwner(serverId, userId);
    if (isOwner)
        return true;
    const permissions = await roleService.calculateMemberPermissions(serverId, userId);
    return Permissions.has(permissions, permission);
}
export default async function voiceRoutes(app) {
    app.addHook('onRequest', requireAuth);
    app.post('/channels/:channelId/join', {
        schema: {
            description: 'Join a voice channel',
            tags: ['Voice'],
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
        if (channel.type !== 'voice') {
            return reply.code(400).send({ success: false, error: { code: 'INVALID_CHANNEL_TYPE', message: 'Channel is not a voice channel' } });
        }
        const isMember = await serverService.isMember(channel.server_id, userId);
        if (!isMember) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
        }
        const hasPerms = await checkServerPermission(channel.server_id, userId, PERMISSION_FLAGS.CONNECT);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to connect to voice channels' } });
        }
        const sessionId = uuidv4();
        const voiceState = await voiceStateService.createVoiceState({
            channelId,
            userId,
            serverId: channel.server_id,
            sessionId,
        });
        return reply.send(successResponse({
            sessionId,
            voiceState,
        }));
    });
    app.post('/channels/:channelId/leave', {
        schema: {
            description: 'Leave a voice channel',
            tags: ['Voice'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['channelId'],
                properties: {
                    channelId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                204: { type: 'null' },
            },
        },
    }, async (request, reply) => {
        const { channelId } = request.params;
        const userId = request.user.userId;
        await voiceStateService.deleteVoiceStateByUserChannel(channelId, userId);
        return reply.code(204).send();
    });
    app.get('/channels/:channelId', {
        schema: {
            description: 'Get voice states for a channel',
            tags: ['Voice'],
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
        const states = await voiceStateService.getChannelVoiceStates(channelId);
        return reply.send(successResponse(states));
    });
    app.patch('/sessions/:sessionId/state', {
        schema: {
            description: 'Update voice state',
            tags: ['Voice'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['sessionId'],
                properties: {
                    sessionId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    selfMute: { type: 'boolean' },
                    selfDeaf: { type: 'boolean' },
                    selfVideo: { type: 'boolean' },
                    selfStream: { type: 'boolean' },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
        preHandler: validateBody(updateStateSchema),
    }, async (request, reply) => {
        const { sessionId } = request.params;
        const userId = request.user.userId;
        const body = request.body;
        const state = await voiceStateService.getVoiceStateBySession(sessionId);
        if (!state) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Voice state not found' } });
        }
        if (state.user_id !== userId) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not your voice session' } });
        }
        const updated = await voiceStateService.updateVoiceState(sessionId, body);
        return reply.send(successResponse(updated));
    });
    app.post('/sessions/:sessionId/move', {
        schema: {
            description: 'Move user to different voice channel',
            tags: ['Voice'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['sessionId'],
                properties: {
                    sessionId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                required: ['targetChannelId'],
                properties: {
                    targetChannelId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
        preHandler: validateBody(moveUserSchema),
    }, async (request, reply) => {
        const { sessionId } = request.params;
        const { targetChannelId } = request.body;
        const userId = request.user.userId;
        const state = await voiceStateService.getVoiceStateBySession(sessionId);
        if (!state) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Voice state not found' } });
        }
        const hasPerms = await checkServerPermission(state.server_id, userId, PERMISSION_FLAGS.MOVE_MEMBERS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to move members' } });
        }
        const targetChannel = await channelService.getChannel(targetChannelId);
        if (!targetChannel) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Target channel not found' } });
        }
        if (targetChannel.server_id !== state.server_id) {
            return reply.code(400).send({ success: false, error: { code: 'INVALID_CHANNEL', message: 'Target channel must be in the same server' } });
        }
        if (targetChannel.type !== 'voice') {
            return reply.code(400).send({ success: false, error: { code: 'INVALID_CHANNEL_TYPE', message: 'Target channel must be a voice channel' } });
        }
        const updated = await voiceStateService.moveUser(sessionId, targetChannelId);
        return reply.send(successResponse(updated));
    });
    app.patch('/sessions/:sessionId/mute', {
        schema: {
            description: 'Server mute a user in voice channel',
            tags: ['Voice'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['sessionId'],
                properties: {
                    sessionId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    suppress: { type: 'boolean' },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
    }, async (request, reply) => {
        const { sessionId } = request.params;
        const { suppress = true } = request.body || {};
        const userId = request.user.userId;
        const state = await voiceStateService.getVoiceStateBySession(sessionId);
        if (!state) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Voice state not found' } });
        }
        const hasPerms = await checkServerPermission(state.server_id, userId, PERMISSION_FLAGS.MUTE_MEMBERS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to mute members' } });
        }
        const updated = await voiceStateService.suppressUser(sessionId, suppress);
        return reply.send(successResponse(updated));
    });
    app.patch('/sessions/:sessionId/deafen', {
        schema: {
            description: 'Server deafen a user in voice channel',
            tags: ['Voice'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['sessionId'],
                properties: {
                    sessionId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    deafen: { type: 'boolean' },
                },
            },
            response: {
                200: { type: 'object' },
            },
        },
    }, async (request, reply) => {
        const { sessionId } = request.params;
        const { deafen = true } = request.body || {};
        const userId = request.user.userId;
        const state = await voiceStateService.getVoiceStateBySession(sessionId);
        if (!state) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Voice state not found' } });
        }
        const hasPerms = await checkServerPermission(state.server_id, userId, PERMISSION_FLAGS.DEAFEN_MEMBERS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to deafen members' } });
        }
        const updated = await voiceStateService.updateVoiceState(sessionId, { selfDeaf: deafen });
        return reply.send(successResponse(updated));
    });
    app.delete('/sessions/:sessionId/kick', {
        schema: {
            description: 'Kick user from voice channel',
            tags: ['Voice'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['sessionId'],
                properties: {
                    sessionId: { type: 'string' },
                },
            },
            response: {
                204: { type: 'null' },
            },
        },
    }, async (request, reply) => {
        const { sessionId } = request.params;
        const userId = request.user.userId;
        const state = await voiceStateService.getVoiceStateBySession(sessionId);
        if (!state) {
            return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Voice state not found' } });
        }
        const hasPerms = await checkServerPermission(state.server_id, userId, PERMISSION_FLAGS.MOVE_MEMBERS);
        if (!hasPerms) {
            return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to kick members from voice' } });
        }
        await voiceStateService.kickUser(sessionId);
        return reply.code(204).send();
    });
    app.get('/channels/:channelId/streams', {
        schema: {
            description: 'Get active streams in a voice channel',
            tags: ['Voice'],
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
        const streams = await voiceStateService.getChannelStreams(channelId);
        return reply.send(successResponse(streams));
    });
}
//# sourceMappingURL=index.js.map