/**
 * Permission Service
 * Handles permission checking and overwrites
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { PERMISSION_FLAGS, Permissions, PermissionOverwriteType } from '@freedomtalk/shared';
import { roleService } from '../server/role.service';
import { serverService } from '../server/server.service';

export interface PermissionOverwriteData {
  id: string;
  channel_id: string;
  target_id: string;
  target_type: PermissionOverwriteType;
  allow: string;
  deny: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOverwriteInput {
  channelId: string;
  targetId: string;
  targetType: PermissionOverwriteType;
  allow?: bigint;
  deny?: bigint;
}

export interface UpdateOverwriteInput {
  allow?: bigint;
  deny?: bigint;
}

class PermissionService {
  /**
   * Get all overwrites for a channel
   */
  async getChannelOverwrites(channelId: string): Promise<PermissionOverwriteData[]> {
    const overwrites = await db('permission_overwrites')
      .where('channel_id', channelId);

    return overwrites;
  }

  /**
   * Get a specific overwrite
   */
  async getOverwrite(channelId: string, targetId: string): Promise<PermissionOverwriteData | null> {
    const overwrite = await db('permission_overwrites')
      .where('channel_id', channelId)
      .where('target_id', targetId)
      .first();

    return overwrite || null;
  }

  /**
   * Create or update a permission overwrite
   */
  async setOverwrite(input: CreateOverwriteInput): Promise<PermissionOverwriteData> {
    // Check if overwrite exists
    const existing = await this.getOverwrite(input.channelId, input.targetId);

    if (existing) {
      // Update existing
      const [updated] = await db('permission_overwrites')
        .where('channel_id', input.channelId)
        .where('target_id', input.targetId)
        .update({
          allow: (input.allow || 0n).toString(),
          deny: (input.deny || 0n).toString(),
          updated_at: new Date(),
        })
        .returning('*');

      return updated;
    }

    // Create new
    const overwriteId = generateSnowflakeId();
    const [overwrite] = await db('permission_overwrites')
      .insert({
        id: overwriteId,
        channel_id: input.channelId,
        target_id: input.targetId,
        target_type: input.targetType,
        allow: (input.allow || 0n).toString(),
        deny: (input.deny || 0n).toString(),
      })
      .returning('*');

    return overwrite;
  }

  /**
   * Update an existing overwrite
   */
  async updateOverwrite(
    channelId: string,
    targetId: string,
    input: UpdateOverwriteInput
  ): Promise<PermissionOverwriteData> {
    const existing = await this.getOverwrite(channelId, targetId);
    if (!existing) {
      throw new AppError(404, 'OVERWRITE_NOT_FOUND', 'Permission overwrite not found');
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.allow !== undefined) {
      updateData.allow = input.allow.toString();
    }

    if (input.deny !== undefined) {
      updateData.deny = input.deny.toString();
    }

    const [updated] = await db('permission_overwrites')
      .where('channel_id', channelId)
      .where('target_id', targetId)
      .update(updateData)
      .returning('*');

    return updated;
  }

  /**
   * Delete a permission overwrite
   */
  async deleteOverwrite(channelId: string, targetId: string): Promise<void> {
    await db('permission_overwrites')
      .where('channel_id', channelId)
      .where('target_id', targetId)
      .delete();
  }

  /**
   * Calculate effective permissions for a user in a channel
   * Takes into account: role permissions, @everyone, and channel overwrites
   */
  async calculateChannelPermissions(serverId: string, channelId: string, userId: string): Promise<bigint> {
    // Check if owner (has all permissions)
    const isOwner = await serverService.isOwner(serverId, userId);
    if (isOwner) {
      const { ALL_PERMISSIONS } = await import('@freedomtalk/shared');
      return ALL_PERMISSIONS;
    }

    // Get base permissions from roles
    let permissions = await roleService.calculateMemberPermissions(serverId, userId);

    // Check if administrator (bypasses overwrites)
    if (Permissions.has(permissions, PERMISSION_FLAGS.ADMINISTRATOR)) {
      return permissions;
    }

    // Apply channel overwrites
    const overwrites = await this.getChannelOverwrites(channelId);

    // Get member's roles
    const memberRoles = await db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .pluck('role_id');

    // Apply @everyone overwrite first
    const everyoneOverwrite = overwrites.find(o => o.target_id === serverId);
    if (everyoneOverwrite) {
      permissions &= ~BigInt(everyoneOverwrite.deny); // Remove denied
      permissions |= BigInt(everyoneOverwrite.allow);  // Add allowed
    }

    // Apply role overwrites
    let allowRoles = 0n;
    let denyRoles = 0n;

    for (const overwrite of overwrites) {
      if (overwrite.target_type === 'role' && memberRoles.includes(overwrite.target_id)) {
        allowRoles |= BigInt(overwrite.allow);
        denyRoles |= BigInt(overwrite.deny);
      }
    }

    // Apply role denies then allows
    permissions &= ~denyRoles;
    permissions |= allowRoles;

    // Apply member-specific overwrite (highest priority)
    const memberOverwrite = overwrites.find(o => o.target_type === 'member' && o.target_id === userId);
    if (memberOverwrite) {
      permissions &= ~BigInt(memberOverwrite.deny);
      permissions |= BigInt(memberOverwrite.allow);
    }

    return permissions;
  }

  /**
   * Check if user has a specific permission in a channel
   */
  async hasChannelPermission(
    serverId: string,
    channelId: string,
    userId: string,
    permission: bigint
  ): Promise<boolean> {
    const permissions = await this.calculateChannelPermissions(serverId, channelId, userId);
    return Permissions.has(permissions, permission);
  }

  /**
   * Check if user has a specific permission in the server (not channel-specific)
   */
  async hasServerPermission(
    serverId: string,
    userId: string,
    permission: bigint
  ): Promise<boolean> {
    const permissions = await roleService.calculateMemberPermissions(serverId, userId);
    return Permissions.has(permissions, permission);
  }

  /**
   * Get all permissions for a user in a channel (for debugging/UI)
   */
  async getPermissionBreakdown(
    serverId: string,
    channelId: string,
    userId: string
  ): Promise<{
    base: string[];
    overwrites: Array<{
      type: string;
      target: string;
      allow: string[];
      deny: string[];
    }>;
    final: string[];
  }> {
    const basePermissions = await roleService.calculateMemberPermissions(serverId, userId);
    const finalPermissions = await this.calculateChannelPermissions(serverId, channelId, userId);
    const overwrites = await this.getChannelOverwrites(channelId);

    // Get member's roles
    const memberRoles = await db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .pluck('role_id');

    const overwritesBreakdown = [];

    for (const overwrite of overwrites) {
      // Only include relevant overwrites
      const isRelevant =
        overwrite.target_type === 'member' ? overwrite.target_id === userId :
        overwrite.target_id === serverId ? true : // @everyone
        memberRoles.includes(overwrite.target_id); // Role

      if (isRelevant) {
        let targetName = overwrite.target_id;
        if (overwrite.target_id === serverId) {
          targetName = '@everyone';
        } else if (overwrite.target_type === 'role') {
          const role = await db('roles').where('id', overwrite.target_id).first();
          targetName = role?.name || overwrite.target_id;
        } else {
          const user = await db('users').where('id', overwrite.target_id).first();
          targetName = user?.username || overwrite.target_id;
        }

        overwritesBreakdown.push({
          type: overwrite.target_type,
          target: targetName,
          allow: Permissions.toArray(BigInt(overwrite.allow)),
          deny: Permissions.toArray(BigInt(overwrite.deny)),
        });
      }
    }

    return {
      base: Permissions.toArray(basePermissions),
      overwrites: overwritesBreakdown,
      final: Permissions.toArray(finalPermissions),
    };
  }

  /**
   * Sync overwrites from a category to its channels
   */
  async syncCategoryPermissions(categoryId: string): Promise<void> {
    // Get category overwrites
    const { db } = await import('../../config/database');
    const category = await db('channel_categories').where('id', categoryId).first();

    if (!category) return;

    // Get all channels in the category (for future use)
    void await db('channels')
      .where('category_id', categoryId)
      .pluck('id');

    // For now, we don't auto-sync - each channel can have its own overwrites
    // This could be implemented as a "sync permissions" feature if needed
  }
}

export const permissionService = new PermissionService();
