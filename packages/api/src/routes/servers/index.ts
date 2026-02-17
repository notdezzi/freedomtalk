/**
 * Server Routes
 * Handles server management endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { successResponse } from '../../utils/errors';
import { serverService } from '../../services/server/server.service';
import { serverMemberService } from '../../services/server/server-member.service';
import { serverBanService } from '../../services/server/server-ban.service';
import { inviteService } from '../../services/server/invite.service';
import { VALIDATION, PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';

// Validation schemas
const createServerSchema = z.object({
  name: z.string().min(VALIDATION.SERVER_NAME.MIN_LENGTH).max(VALIDATION.SERVER_NAME.MAX_LENGTH),
  description: z.string().max(VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH).optional(),
  iconUrl: z.string().max(2048).optional(), // Accept any string (URL or data URL)
});

const updateServerSchema = z.object({
  name: z.string().min(VALIDATION.SERVER_NAME.MIN_LENGTH).max(VALIDATION.SERVER_NAME.MAX_LENGTH).optional(),
  description: z.string().max(VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH).nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  systemChannelId: z.string().min(18).max(20).nullable().optional(),
  rulesChannelId: z.string().min(18).max(20).nullable().optional(),
  afkChannelId: z.string().min(18).max(20).nullable().optional(),
  afkTimeout: z.number().int().min(0).optional(),
  preferredLocale: z.string().max(10).optional(),
});

const updateMemberSchema = z.object({
  nickname: z.string().min(VALIDATION.NICKNAME.MIN_LENGTH).max(VALIDATION.NICKNAME.MAX_LENGTH).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  mute: z.boolean().optional(),
  deaf: z.boolean().optional(),
  communicationDisabledUntil: z.string().datetime().nullable().optional(),
});

const memberRolesSchema = z.object({
  roleIds: z.array(z.string().min(18).max(20)),
});

const createBanSchema = z.object({
  reason: z.string().max(512).optional(),
  deleteMessageDays: z.number().int().min(0).max(7).optional(),
});

const createInviteSchema = z.object({
  maxUses: z.number().int().min(0).max(VALIDATION.INVITE.MAX_USES).optional(),
  maxAge: z.number().int().min(0).max(VALIDATION.INVITE.MAX_AGE).optional(),
  temporary: z.boolean().optional(),
});

const joinServerSchema = z.object({
  inviteCode: z.string().min(1).max(VALIDATION.INVITE.MAX_CODE_LENGTH),
});

// Permission check helper
async function checkServerPermission(
  serverId: string,
  userId: string,
  permission: bigint
): Promise<boolean> {
  // Check if owner
  const isOwner = await serverService.isOwner(serverId, userId);
  if (isOwner) return true;

  // Get member's roles and calculate permissions
  const member = await serverMemberService.getMember(serverId, userId);
  if (!member) return false;

  // Get @everyone role permissions
  const server = await serverService.getServer(serverId);
  if (!server) return false;

  let permissions = 0n;

  // Add @everyone permissions
  const everyoneRole = await getEveryoneRole(serverId);
  if (everyoneRole) {
    permissions |= BigInt(everyoneRole.permissions);
  }

  // Add member's role permissions
  if (member.roles) {
    for (const role of member.roles) {
      const fullRole = await getRole(role.id);
      if (fullRole) {
        permissions |= BigInt(fullRole.permissions);
      }
    }
  }

  return Permissions.has(permissions, permission);
}

// Helper to get @everyone role
async function getEveryoneRole(serverId: string) {
  const { db } = await import('../../config/database');
  return db('roles').where('server_id', serverId).where('name', '@everyone').first();
}

// Helper to get role by ID
async function getRole(roleId: string) {
  const { db } = await import('../../config/database');
  return db('roles').where('id', roleId).first();
}

export default async function serverRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  // ============================================
  // Server CRUD
  // ============================================

  /**
   * POST /api/v1/servers
   * Create a new server
   */
  app.post(
    '/',
    {
      schema: {
        description: 'Create a new server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: VALIDATION.SERVER_NAME.MIN_LENGTH, maxLength: VALIDATION.SERVER_NAME.MAX_LENGTH },
            description: { type: 'string', maxLength: VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH },
            iconUrl: { type: 'string', maxLength: 2048 },
          },
        },
        // Remove response schema to avoid Fastify stripping properties
      },
      preHandler: validateBody(createServerSchema),
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof createServerSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;

      const server = await serverService.createServer({
        ...request.body,
        ownerId: userId,
      });

      return reply.code(201).send(successResponse(server));
    }
  );

  /**
   * GET /api/v1/servers
   * Get user's servers
   */
  app.get(
    '/',
    {
      schema: {
        description: 'Get all servers the user is a member of',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        // Remove response schema to avoid Fastify stripping properties
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      const servers = await serverService.getUserServers(userId);
      return reply.send(successResponse(servers));
    }
  );

  /**
   * GET /api/v1/servers/:serverId
   * Get server by ID
   */
  app.get(
    '/:serverId',
    {
      schema: {
        description: 'Get server details',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check if user is a member
      const isMember = await serverService.isMember(serverId, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const server = await serverService.getServer(serverId);
      if (!server) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Server not found' } });
      }

      return reply.send(successResponse(server));
    }
  );

  /**
   * PATCH /api/v1/servers/:serverId
   * Update server settings
   */
  app.patch(
    '/:serverId',
    {
      schema: {
        description: 'Update server settings (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: VALIDATION.SERVER_NAME.MIN_LENGTH, maxLength: VALIDATION.SERVER_NAME.MAX_LENGTH },
            description: { type: 'string', maxLength: VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH, nullable: true },
            iconUrl: { type: 'string', format: 'uri', nullable: true },
            bannerUrl: { type: 'string', format: 'uri', nullable: true },
            systemChannelId: { type: 'string', minLength: 15, maxLength: 25, nullable: true },
            rulesChannelId: { type: 'string', minLength: 15, maxLength: 25, nullable: true },
            afkChannelId: { type: 'string', minLength: 15, maxLength: 25, nullable: true },
            afkTimeout: { type: 'integer', minimum: 0 },
            preferredLocale: { type: 'string', maxLength: 10 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(updateServerSchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Body: z.infer<typeof updateServerSchema> }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      const server = await serverService.updateServer(serverId, request.body, userId);
      return reply.send(successResponse(server));
    }
  );

  /**
   * DELETE /api/v1/servers/:serverId
   * Delete server
   */
  app.delete(
    '/:serverId',
    {
      schema: {
        description: 'Delete server (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      await serverService.deleteServer(serverId, userId);
      return reply.code(204).send();
    }
  );

  // ============================================
  // Server Membership
  // ============================================

  /**
   * POST /api/v1/servers/join
   * Join a server using an invite code
   */
  app.post(
    '/join',
    {
      schema: {
        description: 'Join a server using an invite code',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['inviteCode'],
          properties: {
            inviteCode: { type: 'string', minLength: 1, maxLength: VALIDATION.INVITE.MAX_CODE_LENGTH },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(joinServerSchema),
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof joinServerSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { inviteCode } = request.body;

      // Use invite
      const invite = await inviteService.useInvite(inviteCode, userId);

      // Add member
      const member = await serverMemberService.addMember({
        serverId: invite.server_id,
        userId,
        pending: invite.temporary,
      });

      return reply.send(successResponse({ server: invite.server, member }));
    }
  );

  /**
   * GET /api/v1/servers/invite/:code/preview
   * Preview an invite without joining
   */
  app.get(
    '/invite/:code/preview',
    {
      schema: {
        description: 'Preview an invite without joining the server',
        tags: ['Servers', 'Invites'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 1, maxLength: VALIDATION.INVITE.MAX_CODE_LENGTH },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
      const { code } = request.params;

      const invite = await inviteService.getInviteByCode(code);

      if (!invite) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invalid invite code' },
        });
      }

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return reply.code(410).send({
          success: false,
          error: { code: 'EXPIRED', message: 'This invite has expired' },
        });
      }

      // Check if max uses reached
      if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
        return reply.code(410).send({
          success: false,
          error: { code: 'MAX_USES', message: 'This invite has reached its maximum uses' },
        });
      }

      return reply.send(successResponse({
        invite: {
          code: invite.code,
          expiresAt: invite.expires_at,
          maxUses: invite.max_uses,
          uses: invite.uses,
        },
        server: invite.server,
        channel: invite.channel,
        inviter: invite.inviter,
      }));
    }
  );

  /**
   * GET /api/v1/servers/:serverId/members
   * Get server members
   */
  app.get(
    '/:serverId/members',
    {
      schema: {
        description: 'Get server members',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 1000 },
            offset: { type: 'integer', minimum: 0 },
            search: { type: 'string' },
          },
        },
        // Remove response schema to avoid Fastify stripping properties
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Querystring: { limit?: number; offset?: number; search?: string } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check if user is a member
      const isMember = await serverService.isMember(serverId, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const result = await serverMemberService.getMembers(serverId, {
        limit: request.query.limit,
        offset: request.query.offset,
        search: request.query.search,
      });

      return reply.send(successResponse(result));
    }
  );

  /**
   * GET /api/v1/servers/:serverId/members/:userId
   * Get specific member
   */
  app.get(
    '/:serverId/members/:userId',
    {
      schema: {
        description: 'Get a specific server member',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'userId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            userId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string; userId: string } }>, reply: FastifyReply) => {
      const { serverId, userId } = request.params;
      const currentUserId = request.user!.id;

      // Check if current user is a member
      const isMember = await serverService.isMember(serverId, currentUserId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const member = await serverMemberService.getMember(serverId, userId);
      if (!member) {
        return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
      }

      return reply.send(successResponse(member));
    }
  );

  /**
   * PATCH /api/v1/servers/:serverId/members/:userId
   * Update member (nickname, roles, etc.)
   */
  app.patch(
    '/:serverId/members/:userId',
    {
      schema: {
        description: 'Update member settings',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'userId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            userId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            nickname: { type: 'string', minLength: VALIDATION.NICKNAME.MIN_LENGTH, maxLength: VALIDATION.NICKNAME.MAX_LENGTH, nullable: true },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            mute: { type: 'boolean' },
            deaf: { type: 'boolean' },
            communicationDisabledUntil: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(updateMemberSchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string; userId: string }; Body: z.infer<typeof updateMemberSchema> }>, reply: FastifyReply) => {
      const { serverId, userId } = request.params;
      const currentUserId = request.user!.id;
      const body = request.body;

      // Users can update their own nickname/avatar
      // Only moderators can update mute/deaf/timeout
      const isSelf = userId === currentUserId;
      const hasModPerms = await checkServerPermission(serverId, currentUserId, PERMISSION_FLAGS.MODERATE_MEMBERS);

      if (!isSelf && !hasModPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to update this member' } });
      }

      // Non-mods can only update their own nickname/avatar
      if (!hasModPerms) {
        if (body.mute !== undefined || body.deaf !== undefined || body.communicationDisabledUntil !== undefined) {
          return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to update moderation settings' } });
        }
      }

      const member = await serverMemberService.updateMember(serverId, userId, body);
      return reply.send(successResponse(member));
    }
  );

  /**
   * DELETE /api/v1/servers/:serverId/members/:userId
   * Kick a member from server
   */
  app.delete(
    '/:serverId/members/:userId',
    {
      schema: {
        description: 'Kick a member from the server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'userId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            userId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string; userId: string } }>, reply: FastifyReply) => {
      const { serverId, userId } = request.params;
      const currentUserId = request.user!.id;

      // Check if leaving or kicking
      const isSelf = userId === currentUserId;

      if (!isSelf) {
        // Check KICK_MEMBERS permission
        const hasPerms = await checkServerPermission(serverId, currentUserId, PERMISSION_FLAGS.KICK_MEMBERS);
        if (!hasPerms) {
          return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to kick members' } });
        }
      }

      await serverMemberService.removeMember(serverId, userId, currentUserId);
      return reply.code(204).send();
    }
  );

  /**
   * PUT /api/v1/servers/:serverId/members/:userId/roles
   * Set member roles
   */
  app.put(
    '/:serverId/members/:userId/roles',
    {
      schema: {
        description: 'Set member roles',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'userId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            userId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['roleIds'],
          properties: {
            roleIds: { type: 'array', items: { type: 'string', minLength: 15, maxLength: 25 } },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
      preHandler: validateBody(memberRolesSchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string; userId: string }; Body: z.infer<typeof memberRolesSchema> }>, reply: FastifyReply) => {
      const { serverId, userId } = request.params;
      const currentUserId = request.user!.id;
      const { roleIds } = request.body;

      // Check MANAGE_ROLES permission
      const hasPerms = await checkServerPermission(serverId, currentUserId, PERMISSION_FLAGS.MANAGE_ROLES);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage roles' } });
      }

      await serverMemberService.setRoles(serverId, userId, roleIds);
      return reply.code(204).send();
    }
  );

  // ============================================
  // Server Bans
  // ============================================

  /**
   * GET /api/v1/servers/:serverId/bans
   * Get server bans
   */
  app.get(
    '/:serverId/bans',
    {
      schema: {
        description: 'Get server bans',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 1000 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Querystring: { limit?: number; offset?: number } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check BAN_MEMBERS permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.BAN_MEMBERS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to view bans' } });
      }

      const result = await serverBanService.getBans(serverId, {
        limit: request.query.limit,
        offset: request.query.offset,
      });

      return reply.send(successResponse(result));
    }
  );

  /**
   * POST /api/v1/servers/:serverId/bans/:userId
   * Ban a user
   */
  app.post(
    '/:serverId/bans/:userId',
    {
      schema: {
        description: 'Ban a user from the server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'userId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            userId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', maxLength: 512 },
            deleteMessageDays: { type: 'integer', minimum: 0, maximum: 7 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
      preHandler: validateBody(createBanSchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string; userId: string }; Body: z.infer<typeof createBanSchema> }>, reply: FastifyReply) => {
      const { serverId, userId: targetUserId } = request.params;
      const currentUserId = request.user!.id;

      // Check BAN_MEMBERS permission
      const hasPerms = await checkServerPermission(serverId, currentUserId, PERMISSION_FLAGS.BAN_MEMBERS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to ban members' } });
      }

      const ban = await serverBanService.createBan({
        serverId,
        userId: targetUserId,
        reason: request.body.reason,
        bannedBy: currentUserId,
        deleteMessageDays: request.body.deleteMessageDays,
      });

      return reply.send(successResponse(ban));
    }
  );

  /**
   * DELETE /api/v1/servers/:serverId/bans/:userId
   * Unban a user
   */
  app.delete(
    '/:serverId/bans/:userId',
    {
      schema: {
        description: 'Unban a user from the server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'userId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            userId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string; userId: string } }>, reply: FastifyReply) => {
      const { serverId, userId: targetUserId } = request.params;
      const currentUserId = request.user!.id;

      // Check BAN_MEMBERS permission
      const hasPerms = await checkServerPermission(serverId, currentUserId, PERMISSION_FLAGS.BAN_MEMBERS);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to unban members' } });
      }

      await serverBanService.removeBan(serverId, targetUserId);
      return reply.code(204).send();
    }
  );

  // ============================================
  // Server Invites
  // ============================================

  /**
   * GET /api/v1/servers/:serverId/invites
   * Get server invites
   */
  app.get(
    '/:serverId/invites',
    {
      schema: {
        description: 'Get server invites',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check if member
      const isMember = await serverService.isMember(serverId, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const invites = await inviteService.getServerInvites(serverId);
      return reply.send(successResponse(invites));
    }
  );

  /**
   * POST /api/v1/servers/:serverId/invites
   * Create an invite
   */
  app.post(
    '/:serverId/invites',
    {
      schema: {
        description: 'Create an invite for the server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            channelId: { type: 'string', minLength: 15, maxLength: 25 },
            maxUses: { type: 'integer', minimum: 0, maximum: VALIDATION.INVITE.MAX_USES },
            maxAge: { type: 'integer', minimum: 0, maximum: VALIDATION.INVITE.MAX_AGE },
            temporary: { type: 'boolean' },
          },
        },
        response: {
          201: { type: 'object' },
        },
      },
      preHandler: validateBody(createInviteSchema),
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Body: z.infer<typeof createInviteSchema> }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;
      const body = request.body;

      // Check CREATE_INSTANT_INVITE permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.CREATE_INSTANT_INVITE);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to create invites' } });
      }

      // Get first text channel if no channelId provided
      let channelId = (request.body as any).channelId;
      if (!channelId) {
        const { db } = await import('../../config/database');
        const channel = await db('channels')
          .where('server_id', serverId)
          .where('type', 'text')
          .orderBy('position', 'asc')
          .first();

        if (!channel) {
          return reply.code(400).send({ success: false, error: { code: 'NO_CHANNEL', message: 'No text channel available' } });
        }
        channelId = channel.id;
      }

      const invite = await inviteService.createInvite({
        serverId,
        channelId,
        inviterId: userId,
        maxUses: body.maxUses,
        maxAge: body.maxAge,
        temporary: body.temporary,
      });

      return reply.code(201).send(successResponse(invite));
    }
  );

  /**
   * DELETE /api/v1/servers/:serverId/invites/:code
   * Delete an invite
   */
  app.delete(
    '/:serverId/invites/:code',
    {
      schema: {
        description: 'Delete an invite',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'code'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            code: { type: 'string' },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string; code: string } }>, reply: FastifyReply) => {
      const { code } = request.params;
      const userId = request.user!.id;

      await inviteService.deleteInvite(code, userId);
      return reply.code(204).send();
    }
  );

  // ============================================
  // Roles
  // ============================================

  /**
   * GET /api/v1/servers/:serverId/roles
   * Get server roles
   */
  app.get(
    '/:serverId/roles',
    {
      schema: {
        description: 'Get server roles',
        tags: ['Roles'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;

      // Check if member
      const isMember = await serverService.isMember(serverId, userId);
      if (!isMember) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this server' } });
      }

      const { roleService } = await import('../../services/server/role.service');
      const roles = await roleService.getServerRoles(serverId);
      return reply.send(successResponse(roles));
    }
  );

  /**
   * POST /api/v1/servers/:serverId/roles
   * Create a new role
   */
  app.post(
    '/:serverId/roles',
    {
      schema: {
        description: 'Create a new role',
        tags: ['Roles'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: VALIDATION.ROLE.MIN_NAME_LENGTH, maxLength: VALIDATION.ROLE.MAX_NAME_LENGTH },
            permissions: { type: 'string' },
            color: { type: 'integer', minimum: 0, maximum: 16777215 },
            hoist: { type: 'boolean' },
            icon: { type: 'string' },
            mentionable: { type: 'boolean' },
          },
        },
        response: {
          201: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Body: any }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;
      const body = request.body as {
        name: string;
        permissions?: string;
        color?: number;
        hoist?: boolean;
        icon?: string;
        mentionable?: boolean;
      };

      // Check MANAGE_ROLES permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_ROLES);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage roles' } });
      }

      const { roleService } = await import('../../services/server/role.service');
      const role = await roleService.createRole({
        serverId,
        name: body.name,
        permissions: body.permissions ? BigInt(body.permissions) : undefined,
        color: body.color,
        hoist: body.hoist,
        icon: body.icon,
        mentionable: body.mentionable,
      });

      return reply.code(201).send(successResponse(role));
    }
  );

  /**
   * PATCH /api/v1/servers/:serverId/roles/:roleId
   * Update a role
   */
  app.patch(
    '/:serverId/roles/:roleId',
    {
      schema: {
        description: 'Update a role',
        tags: ['Roles'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'roleId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            roleId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: VALIDATION.ROLE.MIN_NAME_LENGTH, maxLength: VALIDATION.ROLE.MAX_NAME_LENGTH },
            permissions: { type: 'string' },
            color: { type: 'integer', minimum: 0, maximum: 16777215 },
            hoist: { type: 'boolean' },
            icon: { type: 'string', nullable: true },
            mentionable: { type: 'boolean' },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string; roleId: string }; Body: any }>, reply: FastifyReply) => {
      const { serverId, roleId } = request.params;
      const userId = request.user!.id;
      const body = request.body as {
        name?: string;
        permissions?: string;
        color?: number;
        hoist?: boolean;
        icon?: string | null;
        mentionable?: boolean;
      };

      // Check MANAGE_ROLES permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_ROLES);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage roles' } });
      }

      const { roleService } = await import('../../services/server/role.service');
      const role = await roleService.updateRole(roleId, {
        name: body.name,
        permissions: body.permissions ? BigInt(body.permissions) : undefined,
        color: body.color,
        hoist: body.hoist,
        icon: body.icon,
        mentionable: body.mentionable,
      });

      return reply.send(successResponse(role));
    }
  );

  /**
   * DELETE /api/v1/servers/:serverId/roles/:roleId
   * Delete a role
   */
  app.delete(
    '/:serverId/roles/:roleId',
    {
      schema: {
        description: 'Delete a role',
        tags: ['Roles'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId', 'roleId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
            roleId: { type: 'string', minLength: 15, maxLength: 25 },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string; roleId: string } }>, reply: FastifyReply) => {
      const { serverId, roleId } = request.params;
      const userId = request.user!.id;

      // Check MANAGE_ROLES permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_ROLES);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage roles' } });
      }

      const { roleService } = await import('../../services/server/role.service');
      await roleService.deleteRole(roleId);
      return reply.code(204).send();
    }
  );

  /**
   * PATCH /api/v1/servers/:serverId/roles
   * Update role positions
   */
  app.patch(
    '/:serverId/roles',
    {
      schema: {
        description: 'Update role positions',
        tags: ['Roles'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['serverId'],
          properties: {
            serverId: { type: 'string', minLength: 15, maxLength: 25 },
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
                  id: { type: 'string', minLength: 15, maxLength: 25 },
                  position: { type: 'integer', minimum: 0 },
                },
              },
            },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { serverId: string }; Body: { positions: { id: string; position: number }[] } }>, reply: FastifyReply) => {
      const { serverId } = request.params;
      const userId = request.user!.id;
      const { positions } = request.body;

      // Check MANAGE_ROLES permission
      const hasPerms = await checkServerPermission(serverId, userId, PERMISSION_FLAGS.MANAGE_ROLES);
      if (!hasPerms) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage roles' } });
      }

      const { roleService } = await import('../../services/server/role.service');
      const roles = await roleService.updateRolePositions(serverId, positions);
      return reply.send(successResponse(roles));
    }
  );
}
