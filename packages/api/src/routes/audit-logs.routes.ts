/**
 * Audit Log Routes
 * Handles audit log retrieval
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { successResponse } from '../utils/errors';
import { auditLogService } from '../services/audit/audit.service';
import { serverMemberService } from '../services/server/server-member.service';
import { serverService } from '../services/server/server.service';
import { roleService } from '../services/server/role.service';
import { PERMISSION_FLAGS, Permissions } from '@freedomtalk/shared';
import { ApiError, ApiErrorCode } from '../types/api.types';

// Zod schemas for validation
const serverIdParamSchema = z.object({
  serverId: z.string().length(20, 'Invalid server ID'),
});

const auditLogQuerySchema = z.object({
  user_id: z.string().length(20).optional(),
  action_type: z.string().max(50).optional(),
  target_type: z.string().max(50).optional(),
  target_id: z.string().length(20).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().min(1).max(100).optional()
  ),
  before: z.string().length(20).optional(),
  after: z.string().length(20).optional(),
});

/**
 * Check if user has VIEW_AUDIT_LOG permission in the server
 */
async function canViewAuditLogs(serverId: string, userId: string): Promise<boolean> {
  const member = await serverMemberService.getMember(serverId, userId);
  if (!member) {
    return false;
  }

  // Server owner can always view audit logs
  const server = await serverService.getServer(serverId);
  if (server && server.owner_id === userId) {
    return true;
  }

  // Check permissions from roles
  const permissions = await roleService.calculateMemberPermissions(serverId, userId);
  if (Permissions.has(permissions, PERMISSION_FLAGS.ADMINISTRATOR) ||
      Permissions.has(permissions, PERMISSION_FLAGS.VIEW_AUDIT_LOG)) {
    return true;
  }

  return false;
}

/**
 * Register audit log routes
 */
export default async function auditLogRoutes(app: FastifyInstance) {
  // Get audit logs for a server
  app.get<{ Params: z.infer<typeof serverIdParamSchema>; Querystring: z.infer<typeof auditLogQuerySchema> }>(
    '/servers/:serverId/audit-logs',
    {
      onRequest: [requireAuth],
      schema: {
        params: serverIdParamSchema,
        querystring: auditLogQuerySchema,
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof serverIdParamSchema>; Querystring: z.infer<typeof auditLogQuerySchema> }>) => {
      const { serverId } = request.params;
      const userId = request.user!.id;
      const query = request.query;

      // Check permissions
      const canView = await canViewAuditLogs(serverId, userId);
      if (!canView) {
        throw new ApiError(ApiErrorCode.FORBIDDEN, 'You do not have permission to view audit logs', 403);
      }

      // Build filter from query params
      const filter = {
        userId: query.user_id,
        actionType: query.action_type as any,
        targetType: query.target_type as any,
        targetId: query.target_id,
        startDate: query.start_date ? new Date(query.start_date) : undefined,
        endDate: query.end_date ? new Date(query.end_date) : undefined,
      };

      const pagination = {
        limit: query.limit || 50,
        before: query.before,
        after: query.after,
      };

      const { entries, hasMore } = await auditLogService.getServerAuditLogs(serverId, filter, pagination);

      // Format response
      const formattedEntries = entries.map(entry => ({
        id: entry.id,
        server_id: entry.server_id,
        user_id: entry.user_id,
        action_type: entry.action_type,
        target_type: entry.target_type,
        target_id: entry.target_id,
        changes: entry.changes,
        reason: entry.reason,
        metadata: entry.metadata,
        created_at: entry.created_at,
      }));

      return successResponse({
        entries: formattedEntries,
        has_more: hasMore,
      });
    }
  );
}
