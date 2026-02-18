/**
 * Audit Log Service
 *
 * Handles audit log operations including:
 * - Creating audit log entries
 * - Retrieving audit logs with filtering
 * - Pagination support
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { logger } from '../../config/logger';
import type { AuditLogActionType, AuditLogTargetType } from '@freedomtalk/shared';

/**
 * Audit log entry interface matching database schema
 */
export interface AuditLogEntry {
  id: string;
  server_id: string;
  user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

/**
 * Data for creating an audit log entry
 */
export interface CreateAuditLogData {
  serverId: string;
  userId: string;
  actionType: AuditLogActionType;
  targetType?: AuditLogTargetType;
  targetId?: string;
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for querying audit logs
 */
export interface AuditLogFilter {
  userId?: string;
  actionType?: AuditLogActionType | AuditLogActionType[];
  targetType?: AuditLogTargetType;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  before?: string; // Get entries before this ID
  after?: string; // Get entries after this ID
}

/**
 * Audit Log Service Class
 */
class AuditLogService {
  /**
   * Create an audit log entry
   */
  async createEntry(data: CreateAuditLogData): Promise<AuditLogEntry> {
    const id = generateSnowflakeId();

    const [entry] = await db('audit_logs')
      .insert({
        id,
        server_id: data.serverId,
        user_id: data.userId,
        action_type: data.actionType,
        target_type: data.targetType || null,
        target_id: data.targetId || null,
        changes: data.changes ? JSON.parse(JSON.stringify(data.changes)) : null,
        reason: data.reason || null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        created_at: new Date(),
      })
      .returning('*');

    logger.debug({ auditLogId: id, actionType: data.actionType, serverId: data.serverId }, 'Audit log entry created');
    return entry;
  }

  /**
   * Get audit log entries for a server with filtering and pagination
   */
  async getServerAuditLogs(
    serverId: string,
    filter?: AuditLogFilter,
    pagination?: PaginationOptions
  ): Promise<{ entries: AuditLogEntry[]; hasMore: boolean }> {
    const limit = Math.min(pagination?.limit || 50, 100);

    let query = db('audit_logs')
      .where('server_id', serverId)
      .orderBy('created_at', 'desc')
      .limit(limit + 1); // Fetch one extra to check if there are more

    // Apply filters
    if (filter?.userId) {
      query = query.where('user_id', filter.userId);
    }

    if (filter?.actionType) {
      if (Array.isArray(filter.actionType)) {
        query = query.whereIn('action_type', filter.actionType);
      } else {
        query = query.where('action_type', filter.actionType);
      }
    }

    if (filter?.targetType) {
      query = query.where('target_type', filter.targetType);
    }

    if (filter?.targetId) {
      query = query.where('target_id', filter.targetId);
    }

    if (filter?.startDate) {
      query = query.where('created_at', '>=', filter.startDate);
    }

    if (filter?.endDate) {
      query = query.where('created_at', '<=', filter.endDate);
    }

    // Apply cursor-based pagination
    if (pagination?.before) {
      const beforeEntry = await this.getEntryById(pagination.before);
      if (beforeEntry) {
        query = query.where('created_at', '<', beforeEntry.created_at);
      }
    }

    if (pagination?.after) {
      const afterEntry = await this.getEntryById(pagination.after);
      if (afterEntry) {
        query = query.where('created_at', '>', afterEntry.created_at);
      }
    }

    const entries = await query;
    const hasMore = entries.length > limit;

    return {
      entries: entries.slice(0, limit),
      hasMore,
    };
  }

  /**
   * Get a single audit log entry by ID
   */
  async getEntryById(entryId: string): Promise<AuditLogEntry | null> {
    const entry = await db('audit_logs').where({ id: entryId }).first();
    return entry || null;
  }

  /**
   * Delete audit logs older than a specified number of days
   */
  async deleteOldEntries(serverId: string, daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await db('audit_logs')
      .where('server_id', serverId)
      .where('created_at', '<', cutoffDate)
      .delete();

    if (deleted > 0) {
      logger.info({ serverId, deleted, daysToKeep }, 'Deleted old audit log entries');
    }

    return deleted;
  }

  /**
   * Helper to log common actions
   */
  async logChannelCreate(serverId: string, userId: string, channelId: string, channelData: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'CHANNEL_CREATE',
      targetType: 'CHANNEL',
      targetId: channelId,
      changes: { after: channelData },
      reason,
    });
  }

  async logChannelUpdate(serverId: string, userId: string, channelId: string, before: Record<string, unknown>, after: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'CHANNEL_UPDATE',
      targetType: 'CHANNEL',
      targetId: channelId,
      changes: { before, after },
      reason,
    });
  }

  async logChannelDelete(serverId: string, userId: string, channelId: string, channelData: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'CHANNEL_DELETE',
      targetType: 'CHANNEL',
      targetId: channelId,
      changes: { before: channelData },
      reason,
    });
  }

  async logRoleCreate(serverId: string, userId: string, roleId: string, roleData: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'ROLE_CREATE',
      targetType: 'ROLE',
      targetId: roleId,
      changes: { after: roleData },
      reason,
    });
  }

  async logRoleUpdate(serverId: string, userId: string, roleId: string, before: Record<string, unknown>, after: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'ROLE_UPDATE',
      targetType: 'ROLE',
      targetId: roleId,
      changes: { before, after },
      reason,
    });
  }

  async logRoleDelete(serverId: string, userId: string, roleId: string, roleData: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'ROLE_DELETE',
      targetType: 'ROLE',
      targetId: roleId,
      changes: { before: roleData },
      reason,
    });
  }

  async logMemberKick(serverId: string, userId: string, targetUserId: string, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'MEMBER_KICK',
      targetType: 'MEMBER',
      targetId: targetUserId,
      reason,
    });
  }

  async logMemberBanAdd(serverId: string, userId: string, targetUserId: string, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'MEMBER_BAN_ADD',
      targetType: 'MEMBER',
      targetId: targetUserId,
      reason,
    });
  }

  async logMemberBanRemove(serverId: string, userId: string, targetUserId: string, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'MEMBER_BAN_REMOVE',
      targetType: 'MEMBER',
      targetId: targetUserId,
      reason,
    });
  }

  async logWebhookCreate(serverId: string, userId: string, webhookId: string, webhookData: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'WEBHOOK_CREATE',
      targetType: 'WEBHOOK',
      targetId: webhookId,
      changes: { after: webhookData },
      reason,
    });
  }

  async logWebhookUpdate(serverId: string, userId: string, webhookId: string, before: Record<string, unknown>, after: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'WEBHOOK_UPDATE',
      targetType: 'WEBHOOK',
      targetId: webhookId,
      changes: { before, after },
      reason,
    });
  }

  async logWebhookDelete(serverId: string, userId: string, webhookId: string, webhookData: Record<string, unknown>, reason?: string): Promise<AuditLogEntry> {
    return this.createEntry({
      serverId,
      userId,
      actionType: 'WEBHOOK_DELETE',
      targetType: 'WEBHOOK',
      targetId: webhookId,
      changes: { before: webhookData },
      reason,
    });
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
