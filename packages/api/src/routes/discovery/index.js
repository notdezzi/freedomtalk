import { requireAuth } from '../../middleware/auth.middleware.js';
import { db } from '../../config/database.js';
import { SERVER_CATEGORIES } from '@freedomtalk/shared';
export default async function discoveryRoutes(app) {
    app.get('/servers', {
        onRequest: [requireAuth],
        schema: {
            description: 'List discoverable servers in directory',
            tags: ['discovery'],
            querystring: {
                type: 'object',
                properties: {
                    category: { type: 'string', maxLength: 50 },
                    sort: { type: 'string', enum: ['member_count', 'recent', 'relevance'], default: 'member_count' },
                    limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
                    offset: { type: 'number', minimum: 0, default: 0 },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        servers: { type: 'array' },
                        total: { type: 'number' },
                        limit: { type: 'number' },
                        offset: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { category, sort = 'member_count', limit = 25, offset = 0 } = request.query;
        let query = db('servers')
            .select('servers.id', 'servers.name', 'servers.description', 'servers.icon_url', 'servers.banner_url', 'servers.member_count', 'servers.verified', 'server_discovery_settings.category', 'server_discovery_settings.discovery_description')
            .join('server_discovery_settings', 'servers.id', 'server_discovery_settings.server_id')
            .where('server_discovery_settings.is_discoverable', true);
        if (category) {
            query = query.where('server_discovery_settings.category', category);
        }
        const countResult = await query.clone().count('servers.id as count').first();
        const total = Number(countResult?.count || 0);
        switch (sort) {
            case 'member_count':
                query = query.orderBy('servers.member_count', 'desc');
                break;
            case 'recent':
                query = query.orderBy('servers.created_at', 'desc');
                break;
            case 'relevance':
            default:
                query = query.orderBy('servers.member_count', 'desc');
                break;
        }
        query = query.limit(limit).offset(offset);
        const servers = await query;
        return reply.send({
            servers: servers.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.discovery_description || s.description,
                icon_url: s.icon_url,
                banner_url: s.banner_url,
                member_count: s.member_count || 0,
                category: s.category,
                verified: s.verified || false,
            })),
            total,
            limit,
            offset,
        });
    });
    app.get('/servers/:serverId/preview', {
        onRequest: [requireAuth],
        schema: {
            description: 'Get server preview for discovery',
            tags: ['discovery'],
            params: {
                type: 'object',
                required: ['serverId'],
                properties: {
                    serverId: { type: 'string', minLength: 20, maxLength: 20 },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        icon_url: { type: 'string' },
                        banner_url: { type: 'string' },
                        member_count: { type: 'number' },
                        online_count: { type: 'number' },
                        category: { type: 'string' },
                        verified: { type: 'boolean' },
                        channels_preview: { type: 'array' },
                    },
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { serverId } = request.params;
        const server = await db('servers')
            .select('servers.id', 'servers.name', 'servers.description', 'servers.icon_url', 'servers.banner_url', 'servers.member_count', 'servers.verified', 'server_discovery_settings.category', 'server_discovery_settings.discovery_description')
            .leftJoin('server_discovery_settings', 'servers.id', 'server_discovery_settings.server_id')
            .where('servers.id', serverId)
            .first();
        if (!server) {
            return reply.status(404).send({ error: 'Server not found' });
        }
        const channels = await db('channels')
            .select('id', 'name', 'type')
            .where('server_id', serverId)
            .where('type', 'text')
            .orderBy('position', 'asc')
            .limit(5);
        const onlineResult = await db('voice_states')
            .where('server_id', serverId)
            .count('id as online_count')
            .first();
        const onlineCount = Number(onlineResult?.online_count || 0);
        return reply.send({
            id: server.id,
            name: server.name,
            description: server.discovery_description || server.description,
            icon_url: server.icon_url,
            banner_url: server.banner_url,
            member_count: server.member_count || 0,
            online_count: onlineCount,
            category: server.category,
            verified: server.verified || false,
            channels_preview: channels.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
            })),
        });
    });
    app.get('/categories', {
        onRequest: [requireAuth],
        schema: {
            description: 'List available server categories',
            tags: ['discovery'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        categories: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        return reply.send({
            categories: [...SERVER_CATEGORIES],
        });
    });
    app.get('/popular', {
        onRequest: [requireAuth],
        schema: {
            description: 'Get popular servers by member count',
            tags: ['discovery'],
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        servers: { type: 'array' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { limit = 10 } = request.query;
        const servers = await db('servers')
            .select('servers.id', 'servers.name', 'servers.description', 'servers.icon_url', 'servers.member_count', 'servers.verified', 'server_discovery_settings.category')
            .join('server_discovery_settings', 'servers.id', 'server_discovery_settings.server_id')
            .where('server_discovery_settings.is_discoverable', true)
            .orderBy('servers.member_count', 'desc')
            .limit(limit);
        return reply.send({
            servers: servers.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                icon_url: s.icon_url,
                member_count: s.member_count || 0,
                category: s.category,
                verified: s.verified || false,
            })),
        });
    });
}
//# sourceMappingURL=index.js.map