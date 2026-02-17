import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { searchService } from '../../services/search/index.js';

/**
 * Search routes
 *
 * All endpoints require authentication
 */
export default async function searchRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/search/messages
   * Search messages with optional filters
   */
  app.post<{ Body: { query: string; channel_id?: string; server_id?: string; author_id?: string; limit?: number; offset?: number } }>(
    '/messages',
    {
      onRequest: [requireAuth],
      schema: {
        description: 'Search messages with optional filters',
        tags: ['search'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 500 },
            channel_id: { type: 'string', minLength: 15, maxLength: 25 },
            server_id: { type: 'string', minLength: 15, maxLength: 25 },
            author_id: { type: 'string', minLength: 15, maxLength: 25 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: { type: 'array' },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
              query_time_ms: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const results = await searchService.searchMessages(body.query, {
        channelId: body.channel_id,
        serverId: body.server_id,
        authorId: body.author_id,
        limit: body.limit,
        offset: body.offset,
      });

      return reply.send({
        results: results.hits,
        total: results.estimatedTotalHits || 0,
        limit: body.limit || 50,
        offset: body.offset || 0,
        query_time_ms: results.processingTimeMs,
      });
    }
  );

  /**
   * POST /api/v1/search/users
   * Search users by username or display name
   */
  app.post<{ Body: { query: string; limit?: number; offset?: number } }>(
    '/users',
    {
      onRequest: [requireAuth],
      schema: {
        description: 'Search users by username or display name',
        tags: ['search'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 200 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: { type: 'array' },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
              query_time_ms: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const results = await searchService.searchUsers(body.query, {
        limit: body.limit,
        offset: body.offset,
      });

      return reply.send({
        results: results.hits,
        total: results.estimatedTotalHits || 0,
        limit: body.limit || 25,
        offset: body.offset || 0,
        query_time_ms: results.processingTimeMs,
      });
    }
  );

  /**
   * POST /api/v1/search/servers
   * Search servers for discovery
   */
  app.post<{ Body: { query: string; category?: string; min_members?: number; limit?: number; offset?: number } }>(
    '/servers',
    {
      onRequest: [requireAuth],
      schema: {
        description: 'Search servers for discovery',
        tags: ['search'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 200 },
            category: { type: 'string', maxLength: 50 },
            min_members: { type: 'number', minimum: 0 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: { type: 'array' },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
              query_time_ms: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const results = await searchService.searchServers(body.query, {
        category: body.category,
        minMembers: body.min_members,
        limit: body.limit,
        offset: body.offset,
      });

      return reply.send({
        results: results.hits,
        total: results.estimatedTotalHits || 0,
        limit: body.limit || 25,
        offset: body.offset || 0,
        query_time_ms: results.processingTimeMs,
      });
    }
  );

  /**
   * GET /api/v1/search/autocomplete
   * Autocomplete suggestions
   */
  app.get<{ Querystring: { type: 'messages' | 'users' | 'servers'; prefix: string; limit?: number } }>(
    '/autocomplete',
    {
      onRequest: [requireAuth],
      schema: {
        description: 'Get autocomplete suggestions',
        tags: ['search'],
        querystring: {
          type: 'object',
          required: ['type', 'prefix'],
          properties: {
            type: { type: 'string', enum: ['messages', 'users', 'servers'] },
            prefix: { type: 'string', minLength: 1, maxLength: 100 },
            limit: { type: 'number', minimum: 1, maximum: 20, default: 10 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                type: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { type, prefix, limit = 10 } = request.query;
      const results = await searchService.autocomplete(type, prefix, limit);
      return reply.send(results);
    }
  );
}
