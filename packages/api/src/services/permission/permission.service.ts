/**
 * Permission Service
 * Handles hierarchical permission checking with waterfall resolution
 *
 * Waterfall Resolution Algorithm:
 * 1. Server owner bypasses all checks
 * 2. Get member's roles sorted by position (highest first)
 * 3. Waterfall through roles:
 *    - If role.allow_permissions & permission -> return 'allow'
 *    - If role.deny_permissions & permission -> return 'deny'
 *    - Neither set = Neutral, continue to next role
 * 4. No role made decision -> default deny
 */

import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import {
  PERMISSION_FLAGS,
  ALL_PERMISSIONS,
  Permissions,
} from '@freedomtalk/shared';
import {
  PermissionResult,
  PermissionBreakdown,
  ChannelPermissionBreakdown,
  RoleWithPermissions,
  PermissionOverwriteData,
  EffectivePermissions,
  ChannelInfo,
  CreateOverwriteInput,
  UpdateOverwriteInput,
  PermissionSource,
  AppliedOverwrite,
} from './permission.types';
import {
  getPermissionState,
  setPermission,
  stringToPermission,
  permissionToString,
  hasAdministrator,
  getAllPermissionFlags,
  calculateEffectiveFromRoles,
} from './permission.utils';
import { generateSnowflakeId } from '../../utils/snowflake';

export class PermissionService {
  // ==========================================
  // Core Permission Resolution Methods
  // ==========================================

  /**
   * Resolve a single permission for a user in a server
   * Uses waterfall resolution through roles
   */
  async resolvePermission(
    userId: string,
    serverId: string,
    permission: bigint
  ): Promise<PermissionResult> {
    // Step 1: Check if owner
    const isOwner = await this.isServerOwner(serverId, userId);
    if (isOwner) {
      return 'allow';
    }

    // Step 2: Get roles sorted by position (highest first)
    const roles = await this.getMemberRolesSorted(userId, serverId);

    // Step 3: Waterfall through roles
    for (const role of roles) {
      const allow = stringToPermission(role.allow_permissions);
      const deny = stringToPermission(role.deny_permissions);

      // Check if ADMINISTRATOR is set - grants all permissions
      if (hasAdministrator(allow)) {
        return 'allow';
      }

      const state = getPermissionState(allow, deny, permission);

      if (state === 'allow') {
        return 'allow';
      }

      if (state === 'deny') {
        return 'deny';
      }

      // Neutral - continue to next role
    }

    // Step 4: No role made decision - default deny
    return 'deny';
  }

  /**
   * Resolve a single permission for a user in a channel
   * Applies channel overwrites on top of server permissions
   */
  async resolveChannelPermission(
    userId: string,
    channelId: string,
    permission: bigint
  ): Promise<PermissionResult> {
    // Get channel info to determine server
    const channel = await this.getChannelInfo(channelId);
    if (!channel) {
      return 'deny';
    }

    const serverId = channel.server_id;

    // Step 1: Check if owner
    const isOwner = await this.isServerOwner(serverId, userId);
    if (isOwner) {
      return 'allow';
    }

    // Step 2: Check for ADMINISTRATOR permission at server level
    const hasAdmin = await this.hasServerPermission(userId, serverId, PERMISSION_FLAGS.ADMINISTRATOR);
    if (hasAdmin) {
      return 'allow';
    }

    // Step 3: Get base server permissions via waterfall
    const roles = await this.getMemberRolesSorted(userId, serverId);
    const { allow: baseAllow, deny: baseDeny } = calculateEffectiveFromRoles(
      roles.map((r) => ({
        allow: stringToPermission(r.allow_permissions),
        deny: stringToPermission(r.deny_permissions),
        position: r.position,
      }))
    );

    // Check base permission state
    let currentState = getPermissionState(baseAllow, baseDeny, permission);

    // Step 4: Apply channel overwrites
    const overwrites = await this.getChannelOverwrites(channelId);
    const memberRoleIds = await this.getMemberRoleIds(userId, serverId);

    // Apply @everyone overwrite first
    const everyoneOverwrite = overwrites.find((o) => o.target_id === serverId);
    if (everyoneOverwrite) {
      const overwriteAllow = stringToPermission(everyoneOverwrite.allow);
      const overwriteDeny = stringToPermission(everyoneOverwrite.deny);
      const overwriteState = getPermissionState(overwriteAllow, overwriteDeny, permission);

      if (overwriteState !== 'neutral') {
        currentState = overwriteState;
      }
    }

    // Apply role overwrites (in position order - highest first)
    const roleOverwrites = overwrites.filter(
      (o) => o.target_type === 'role' && memberRoleIds.includes(o.target_id)
    );

    // Sort role overwrites by role position
    const rolePositions = new Map(roles.map((r) => [r.id, r.position]));
    roleOverwrites.sort((a, b) => {
      const posA = rolePositions.get(a.target_id) || 0;
      const posB = rolePositions.get(b.target_id) || 0;
      return posB - posA; // Highest first
    });

    for (const overwrite of roleOverwrites) {
      const overwriteAllow = stringToPermission(overwrite.allow);
      const overwriteDeny = stringToPermission(overwrite.deny);
      const overwriteState = getPermissionState(overwriteAllow, overwriteDeny, permission);

      if (overwriteState !== 'neutral') {
        currentState = overwriteState;
      }
    }

    // Apply member-specific overwrite (highest priority)
    const memberOverwrite = overwrites.find(
      (o) => o.target_type === 'member' && o.target_id === userId
    );
    if (memberOverwrite) {
      const overwriteAllow = stringToPermission(memberOverwrite.allow);
      const overwriteDeny = stringToPermission(memberOverwrite.deny);
      const overwriteState = getPermissionState(overwriteAllow, overwriteDeny, permission);

      if (overwriteState !== 'neutral') {
        currentState = overwriteState;
      }
    }

    // Return final state (neutral defaults to deny)
    return currentState === 'allow' ? 'allow' : 'deny';
  }

  // ==========================================
  // Convenience Methods
  // ==========================================

  /**
   * Check if user has a specific permission in a server
   */
  async hasPermission(userId: string, serverId: string, permission: bigint): Promise<boolean> {
    const result = await this.resolvePermission(userId, serverId, permission);
    return result === 'allow';
  }

  /**
   * Check if user has a specific permission in a channel
   */
  async hasChannelPermission(
    userId: string,
    channelId: string,
    permission: bigint
  ): Promise<boolean> {
    const result = await this.resolveChannelPermission(userId, channelId, permission);
    return result === 'allow';
  }

  /**
   * Check if user has all specified permissions in a server
   */
  async hasAllPermissions(
    userId: string,
    serverId: string,
    permissions: bigint[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      const result = await this.resolvePermission(userId, serverId, permission);
      if (result !== 'allow') {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user has all specified permissions in a channel
   */
  async hasAllChannelPermissions(
    userId: string,
    channelId: string,
    permissions: bigint[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      const result = await this.resolveChannelPermission(userId, channelId, permission);
      if (result !== 'allow') {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user has any of the specified permissions in a server
   */
  async hasAnyPermission(
    userId: string,
    serverId: string,
    permissions: bigint[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      const result = await this.resolvePermission(userId, serverId, permission);
      if (result === 'allow') {
        return true;
      }
    }
    return false;
  }

  // ==========================================
  // Server Permission Helpers
  // ==========================================

  /**
   * Check if user has a specific server-level permission
   * (Does not consider channel overwrites)
   */
  async hasServerPermission(
    userId: string,
    serverId: string,
    permission: bigint
  ): Promise<boolean> {
    return this.hasPermission(userId, serverId, permission);
  }

  // ==========================================
  // Bulk Operations for UI
  // ==========================================

  /**
   * Get a breakdown of all permissions for a user in a server
   * Shows which role/source granted/denied each permission
   */
  async getPermissionBreakdown(userId: string, serverId: string): Promise<PermissionBreakdown> {
    const breakdown: PermissionBreakdown = {};

    // Check if owner
    const isOwner = await this.isServerOwner(serverId, userId);

    if (isOwner) {
      // Owner has all permissions
      for (const [name] of getAllPermissionFlags()) {
        breakdown[name] = {
          result: 'allow',
          source: 'owner',
        };
      }
      return breakdown;
    }

    // Get roles for waterfall
    const roles = await this.getMemberRolesSorted(userId, serverId);

    // Check for administrator
    const hasAdmin = roles.some((r) => hasAdministrator(stringToPermission(r.allow_permissions)));

    if (hasAdmin) {
      for (const [name] of getAllPermissionFlags()) {
        breakdown[name] = {
          result: 'allow',
          source: 'administrator',
        };
      }
      return breakdown;
    }

    // Waterfall through each permission
    for (const [name, flag] of getAllPermissionFlags()) {
      let decided = false;

      for (const role of roles) {
        const allow = stringToPermission(role.allow_permissions);
        const deny = stringToPermission(role.deny_permissions);
        const state = getPermissionState(allow, deny, flag);

        if (state === 'allow') {
          breakdown[name] = {
            result: 'allow',
            source: `role:${role.id}`,
          };
          decided = true;
          break;
        }

        if (state === 'deny') {
          breakdown[name] = {
            result: 'deny',
            source: `role:${role.id}`,
          };
          decided = true;
          break;
        }
      }

      if (!decided) {
        breakdown[name] = {
          result: 'deny',
          source: 'default',
        };
      }
    }

    return breakdown;
  }

  /**
   * Get a breakdown of all permissions for a user in a channel
   * Includes information about applied overwrites
   */
  async getChannelPermissionBreakdown(
    userId: string,
    channelId: string
  ): Promise<ChannelPermissionBreakdown> {
    const permissions: PermissionBreakdown = {};
    const appliedOverwrites: AppliedOverwrite[] = [];

    // Get channel info
    const channel = await this.getChannelInfo(channelId);

    const emptyResult: ChannelPermissionBreakdown = { permissions: {} };

    if (!channel) {
      return emptyResult;
    }

    const serverId = channel.server_id;

    // Check if owner
    const isOwner = await this.isServerOwner(serverId, userId);

    if (isOwner) {
      for (const [name] of getAllPermissionFlags()) {
        permissions[name] = {
          result: 'allow',
          source: 'owner',
        };
      }
      return { permissions };
    }

    // Check for administrator
    const hasAdmin = await this.hasServerPermission(userId, serverId, PERMISSION_FLAGS.ADMINISTRATOR);

    if (hasAdmin) {
      for (const [name] of getAllPermissionFlags()) {
        permissions[name] = {
          result: 'allow',
          source: 'administrator',
        };
      }
      return { permissions };
    }

    // Get roles and overwrites
    const roles = await this.getMemberRolesSorted(userId, serverId);
    const overwrites = await this.getChannelOverwrites(channelId);
    const memberRoleIds = await this.getMemberRoleIds(userId, serverId);

    // Get role positions for sorting
    const rolePositions = new Map(roles.map((r) => [r.id, r.position]));

    // Track which overwrites have been added
    const addedOverwriteIds = new Set<string>();

    // Process each permission
    for (const [name, flag] of getAllPermissionFlags()) {
      let result: PermissionResult = 'deny';
      let source: PermissionSource = 'default';

      // Step 1: Base server permissions from roles
      for (const role of roles) {
        const allow = stringToPermission(role.allow_permissions);
        const deny = stringToPermission(role.deny_permissions);
        const state = getPermissionState(allow, deny, flag);

        if (state === 'allow') {
          result = 'allow';
          source = `role:${role.id}`;
          break;
        }

        if (state === 'deny') {
          result = 'deny';
          source = `role:${role.id}`;
          break;
        }
      }

      // Step 2: Apply @everyone overwrite
      const everyoneOverwrite = overwrites.find((o) => o.target_id === serverId);
      if (everyoneOverwrite) {
        const overwriteAllow = stringToPermission(everyoneOverwrite.allow);
        const overwriteDeny = stringToPermission(everyoneOverwrite.deny);
        const state = getPermissionState(overwriteAllow, overwriteDeny, flag);

        if (state !== 'neutral') {
          result = state === 'allow' ? 'allow' : 'deny';
          source = 'overwrite:everyone';
        }
      }

      // Step 3: Apply role overwrites
      const roleOverwrites = overwrites.filter(
        (o) => o.target_type === 'role' && memberRoleIds.includes(o.target_id)
      );
      roleOverwrites.sort((a, b) => {
        const posA = rolePositions.get(a.target_id) || 0;
        const posB = rolePositions.get(b.target_id) || 0;
        return posB - posA;
      });

      for (const overwrite of roleOverwrites) {
        const overwriteAllow = stringToPermission(overwrite.allow);
        const overwriteDeny = stringToPermission(overwrite.deny);
        const state = getPermissionState(overwriteAllow, overwriteDeny, flag);

        if (state !== 'neutral') {
          result = state === 'allow' ? 'allow' : 'deny';
          source = 'overwrite:role';

          // Track this overwrite (only once)
          if (!addedOverwriteIds.has(overwrite.target_id)) {
            addedOverwriteIds.add(overwrite.target_id);
            const role = roles.find((r) => r.id === overwrite.target_id);
            appliedOverwrites.push({
              targetId: overwrite.target_id,
              targetType: 'role',
              targetName: role?.name,
              allow: Permissions.toArray(overwriteAllow),
              deny: Permissions.toArray(overwriteDeny),
            });
          }
        }
      }

      // Step 4: Apply member overwrite
      const memberOverwrite = overwrites.find(
        (o) => o.target_type === 'member' && o.target_id === userId
      );
      if (memberOverwrite) {
        const overwriteAllow = stringToPermission(memberOverwrite.allow);
        const overwriteDeny = stringToPermission(memberOverwrite.deny);
        const state = getPermissionState(overwriteAllow, overwriteDeny, flag);

        if (state !== 'neutral') {
          result = state === 'allow' ? 'allow' : 'deny';
          source = 'overwrite:member';

          if (!addedOverwriteIds.has(memberOverwrite.target_id)) {
            addedOverwriteIds.add(memberOverwrite.target_id);
            appliedOverwrites.push({
              targetId: memberOverwrite.target_id,
              targetType: 'member',
              allow: Permissions.toArray(overwriteAllow),
              deny: Permissions.toArray(overwriteDeny),
            });
          }
        }
      }

      permissions[name] = { result, source };
    }

    const breakdown: ChannelPermissionBreakdown = { permissions };
    if (appliedOverwrites.length > 0) {
      breakdown.appliedOverwrites = appliedOverwrites;
    }

    return breakdown;
  }

  // ==========================================
  // Role Helpers
  // ==========================================

  /**
   * Get member's roles sorted by position (highest first)
   * Always includes the @everyone role
   */
  async getMemberRolesSorted(userId: string, serverId: string): Promise<RoleWithPermissions[]> {
    // Get role IDs for member
    const memberRoleIds = await db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .pluck('role_id');

    // Get @everyone role by name (all members have it implicitly)
    const everyoneRole = await db('roles')
      .where('server_id', serverId)
      .where('name', '@everyone')
      .first();

    // Combine role IDs, ensuring @everyone is included
    const allRoleIds = everyoneRole
      ? [everyoneRole.id, ...memberRoleIds.filter((id) => id !== everyoneRole.id)]
      : memberRoleIds;

    // If no roles at all, return empty array (shouldn't happen if @everyone exists)
    if (allRoleIds.length === 0) {
      return [];
    }

    // Get role data and sort by position descending (highest first)
    const roles = await db('roles')
      .whereIn('id', allRoleIds)
      .where('server_id', serverId)
      .orderBy('position', 'desc');

    return roles;
  }

  /**
   * Calculate effective permissions for a user in a server
   * Returns combined allow and deny masks from waterfall
   */
  async calculateEffectivePermissions(
    userId: string,
    serverId: string
  ): Promise<EffectivePermissions> {
    // Check if owner
    const isOwner = await this.isServerOwner(serverId, userId);
    if (isOwner) {
      return { allow: ALL_PERMISSIONS, deny: 0n };
    }

    const roles = await this.getMemberRolesSorted(userId, serverId);

    // Check for administrator
    for (const role of roles) {
      if (hasAdministrator(stringToPermission(role.allow_permissions))) {
        return { allow: ALL_PERMISSIONS, deny: 0n };
      }
    }

    return calculateEffectiveFromRoles(
      roles.map((r) => ({
        allow: stringToPermission(r.allow_permissions),
        deny: stringToPermission(r.deny_permissions),
        position: r.position,
      }))
    );
  }

  // ==========================================
  // Overwrite Management
  // ==========================================

  /**
   * Get all overwrites for a channel
   */
  async getChannelOverwrites(channelId: string): Promise<PermissionOverwriteData[]> {
    return db('permission_overwrites').where('channel_id', channelId);
  }

  /**
   * Get a specific overwrite
   */
  async getOverwrite(
    channelId: string,
    targetId: string
  ): Promise<PermissionOverwriteData | null> {
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
    const existing = await this.getOverwrite(input.channelId, input.targetId);

    if (existing) {
      const [updated] = await db('permission_overwrites')
        .where('channel_id', input.channelId)
        .where('target_id', input.targetId)
        .update({
          allow: permissionToString(input.allow || 0n),
          deny: permissionToString(input.deny || 0n),
          updated_at: new Date(),
        })
        .returning('*');

      return updated;
    }

    const overwriteId = generateSnowflakeId();
    const [overwrite] = await db('permission_overwrites')
      .insert({
        id: overwriteId,
        channel_id: input.channelId,
        target_id: input.targetId,
        target_type: input.targetType,
        allow: permissionToString(input.allow || 0n),
        deny: permissionToString(input.deny || 0n),
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

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.allow !== undefined) {
      updateData.allow = permissionToString(input.allow);
    }

    if (input.deny !== undefined) {
      updateData.deny = permissionToString(input.deny);
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
   * Set a single permission in an overwrite
   */
  async setOverwritePermission(
    channelId: string,
    targetId: string,
    targetType: 'role' | 'member',
    permission: bigint,
    state: 'allow' | 'deny' | 'neutral'
  ): Promise<PermissionOverwriteData> {
    const existing = await this.getOverwrite(channelId, targetId);

    let allow: bigint;
    let deny: bigint;

    if (existing) {
      allow = stringToPermission(existing.allow);
      deny = stringToPermission(existing.deny);
    } else {
      allow = 0n;
      deny = 0n;
    }

    const updated = setPermission(allow, deny, permission, state);

    return this.setOverwrite({
      channelId,
      targetId,
      targetType,
      allow: updated.allow,
      deny: updated.deny,
    });
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  /**
   * Check if user is server owner
   */
  private async isServerOwner(serverId: string, userId: string): Promise<boolean> {
    const server = await db('servers').where('id', serverId).where('owner_id', userId).first();
    return !!server;
  }

  /**
   * Get channel info for permission resolution
   */
  private async getChannelInfo(channelId: string): Promise<ChannelInfo | null> {
    const channel = await db('channels')
      .select('id', 'server_id', 'type', 'category_id')
      .where('id', channelId)
      .first();

    return channel || null;
  }

  /**
   * Get role IDs for a member
   */
  private async getMemberRoleIds(userId: string, serverId: string): Promise<string[]> {
    return db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .pluck('role_id');
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
