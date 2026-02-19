/**
 * Role Service
 * Handles server role management with three-state permission model
 *
 * Three-state permission model: Allow, Neutral, Deny
 * - Bit set in `allow` only -> Allow
 * - Bit set in `deny` only -> Deny
 * - Bit not set in either -> Neutral
 * - Bit set in both -> Allow wins (for safety)
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import {
  VALIDATION,
  PERMISSION_FLAGS,
  DEFAULT_PERMISSIONS,
  ALL_PERMISSIONS,
  Permissions,
} from '@freedomtalk/shared';

/**
 * Helper to convert bigint to hex string for database storage
 */
function bigintToHex(value: bigint): string {
  return '0x' + value.toString(16);
}

/**
 * Helper to convert hex string from database to bigint
 */
function hexToBigint(value: string | null): bigint {
  if (!value) return 0n;
  if (value.startsWith('0x')) {
    return BigInt(value);
  }
  return BigInt(value);
}

export interface RoleData {
  id: string;
  server_id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon: string | null;
  position: number;
  allow_permissions: string;
  deny_permissions: string;
  managed: boolean;
  mentionable: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoleInput {
  serverId: string;
  name: string;
  allowPermissions?: bigint;
  denyPermissions?: bigint;
  color?: number;
  hoist?: boolean;
  icon?: string;
  mentionable?: boolean;
  position?: number;
}

export interface UpdateRoleInput {
  name?: string;
  allowPermissions?: bigint;
  denyPermissions?: bigint;
  color?: number;
  hoist?: boolean;
  icon?: string | null;
  mentionable?: boolean;
  position?: number;
}

class RoleService {
  /**
   * Create a new role
   */
  async createRole(input: CreateRoleInput): Promise<RoleData> {
    // Verify server exists
    const server = await db('servers').where('id', input.serverId).first();
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    // Check role limit
    const roleCount = await db('roles').where('server_id', input.serverId).count('id as count').first();
    if (roleCount && parseInt(roleCount.count as string, 10) >= VALIDATION.ROLE.MAX_ROLES_PER_SERVER) {
      throw new AppError(400, 'ROLE_LIMIT_REACHED', `Server has reached the maximum of ${VALIDATION.ROLE.MAX_ROLES_PER_SERVER} roles`);
    }

    // Validate name
    if (input.name.length < VALIDATION.ROLE.MIN_NAME_LENGTH || input.name.length > VALIDATION.ROLE.MAX_NAME_LENGTH) {
      throw new AppError(400, 'INVALID_NAME',
        `Role name must be between ${VALIDATION.ROLE.MIN_NAME_LENGTH} and ${VALIDATION.ROLE.MAX_NAME_LENGTH} characters`);
    }

    // Validate color
    if (input.color !== undefined && (input.color < 0 || input.color > 16777215)) {
      throw new AppError(400, 'INVALID_COLOR', 'Color must be between 0 and 16777215');
    }

    // Get next position (if not specified)
    let position: number;
    if (input.position !== undefined) {
      position = input.position;
    } else {
      const maxPosition = await db('roles')
        .where('server_id', input.serverId)
        .max('position as max')
        .first();
      position = (maxPosition?.max || 0) + 1;
    }

    // Validate permissions if provided
    const allowPermissions = input.allowPermissions ?? 0n;
    const denyPermissions = input.denyPermissions ?? 0n;

    if (!this.validateRolePermissions(allowPermissions, denyPermissions)) {
      throw new AppError(400, 'INVALID_PERMISSIONS', 'Invalid permission configuration');
    }

    const roleId = generateSnowflakeId();
    const [role] = await db('roles')
      .insert({
        id: roleId,
        server_id: input.serverId,
        name: input.name,
        color: input.color || 0,
        hoist: input.hoist || false,
        icon: input.icon || null,
        position,
        allow_permissions: bigintToHex(allowPermissions),
        deny_permissions: bigintToHex(denyPermissions),
        managed: false,
        mentionable: input.mentionable !== undefined ? input.mentionable : true,
      })
      .returning('*');

    return role;
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<RoleData | null> {
    const role = await db('roles').where('id', roleId).first();
    return role || null;
  }

  /**
   * Get all roles for a server
   */
  async getServerRoles(serverId: string): Promise<RoleData[]> {
    const roles = await db('roles')
      .where('server_id', serverId)
      .orderBy('position', 'desc');

    return roles;
  }

  /**
   * Update a role
   */
  async updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleData> {
    const role = await this.getRole(roleId);
    if (!role) {
      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    }

    // Cannot modify @everyone role's name
    if (role.name === '@everyone' && input.name !== undefined) {
      throw new AppError(400, 'CANNOT_MODIFY_EVERYONE', 'Cannot rename the @everyone role');
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) {
      if (input.name.length < VALIDATION.ROLE.MIN_NAME_LENGTH || input.name.length > VALIDATION.ROLE.MAX_NAME_LENGTH) {
        throw new AppError(400, 'INVALID_NAME',
          `Role name must be between ${VALIDATION.ROLE.MIN_NAME_LENGTH} and ${VALIDATION.ROLE.MAX_NAME_LENGTH} characters`);
      }
      updateData.name = input.name;
    }

    if (input.allowPermissions !== undefined) {
      const currentDeny = hexToBigint(role.deny_permissions);
      if (!this.validateRolePermissions(input.allowPermissions, currentDeny)) {
        throw new AppError(400, 'INVALID_PERMISSIONS', 'Invalid permission configuration');
      }
      updateData.allow_permissions = bigintToHex(input.allowPermissions);
    }

    if (input.denyPermissions !== undefined) {
      const currentAllow = hexToBigint(role.allow_permissions);
      if (!this.validateRolePermissions(currentAllow, input.denyPermissions)) {
        throw new AppError(400, 'INVALID_PERMISSIONS', 'Invalid permission configuration');
      }
      updateData.deny_permissions = bigintToHex(input.denyPermissions);
    }

    if (input.color !== undefined) {
      if (input.color < 0 || input.color > 16777215) {
        throw new AppError(400, 'INVALID_COLOR', 'Color must be between 0 and 16777215');
      }
      updateData.color = input.color;
    }

    if (input.hoist !== undefined) {
      updateData.hoist = input.hoist;
    }

    if (input.icon !== undefined) {
      updateData.icon = input.icon;
    }

    if (input.mentionable !== undefined) {
      updateData.mentionable = input.mentionable;
    }

    if (input.position !== undefined) {
      updateData.position = input.position;
    }

    const [updated] = await db('roles')
      .where('id', roleId)
      .update(updateData)
      .returning('*');

    return updated;
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await this.getRole(roleId);
    if (!role) {
      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    }

    // Cannot delete @everyone role
    if (role.name === '@everyone') {
      throw new AppError(400, 'CANNOT_DELETE_EVERYONE', 'Cannot delete the @everyone role');
    }

    // Remove role from all members
    await db('member_roles')
      .where('role_id', roleId)
      .delete();

    // Delete role
    await db('roles').where('id', roleId).delete();
  }

  /**
   * Update role positions (reorder roles)
   */
  async updateRolePositions(serverId: string, positions: { id: string; position: number }[]): Promise<RoleData[]> {
    await db.transaction(async (trx) => {
      for (const { id, position } of positions) {
        await trx('roles')
          .where('id', id)
          .where('server_id', serverId)
          .update({ position, updated_at: new Date() });
      }
    });

    return this.getServerRoles(serverId);
  }

  /**
   * Get @everyone role for a server
   */
  async getEveryoneRole(serverId: string): Promise<RoleData | null> {
    const role = await db('roles')
      .where('server_id', serverId)
      .where('name', '@everyone')
      .first();

    return role || null;
  }

  /**
   * Create @everyone role for a new server
   * This should be called when creating a new server
   */
  async createEveryoneRole(serverId: string): Promise<RoleData> {
    // Check if @everyone role already exists
    const existing = await this.getEveryoneRole(serverId);
    if (existing) {
      return existing;
    }

    const roleId = generateSnowflakeId();
    const [role] = await db('roles')
      .insert({
        id: roleId,
        server_id: serverId,
        name: '@everyone',
        color: 0,
        hoist: false,
        icon: null,
        position: 0,
        allow_permissions: bigintToHex(DEFAULT_PERMISSIONS.allow),
        deny_permissions: bigintToHex(DEFAULT_PERMISSIONS.deny),
        managed: false,
        mentionable: true,
      })
      .returning('*');

    return role;
  }

  /**
   * Validate that permission configuration is valid
   * Returns true if valid, false otherwise
   */
  validateRolePermissions(allow: bigint, deny: bigint): boolean {
    // All permissions must be within valid range
    if (allow < 0n || deny < 0n) {
      return false;
    }

    // Permissions should not exceed ALL_PERMISSIONS
    if ((allow & ~ALL_PERMISSIONS) !== 0n || (deny & ~ALL_PERMISSIONS) !== 0n) {
      return false;
    }

    return true;
  }

  /**
   * Set a permission to "allow" state for a role
   * This sets the bit in allow_permissions and clears it from deny_permissions
   */
  async setPermissionAllow(roleId: string, permission: bigint): Promise<RoleData> {
    const role = await this.getRole(roleId);
    if (!role) {
      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    }

    const currentAllow = hexToBigint(role.allow_permissions);
    const currentDeny = hexToBigint(role.deny_permissions);

    const newAllow = currentAllow | permission;
    const newDeny = currentDeny & ~permission;

    const [updated] = await db('roles')
      .where('id', roleId)
      .update({
        allow_permissions: bigintToHex(newAllow),
        deny_permissions: bigintToHex(newDeny),
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Set a permission to "deny" state for a role
   * This sets the bit in deny_permissions and clears it from allow_permissions
   */
  async setPermissionDeny(roleId: string, permission: bigint): Promise<RoleData> {
    const role = await this.getRole(roleId);
    if (!role) {
      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    }

    const currentAllow = hexToBigint(role.allow_permissions);
    const currentDeny = hexToBigint(role.deny_permissions);

    const newAllow = currentAllow & ~permission;
    const newDeny = currentDeny | permission;

    const [updated] = await db('roles')
      .where('id', roleId)
      .update({
        allow_permissions: bigintToHex(newAllow),
        deny_permissions: bigintToHex(newDeny),
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Set a permission to "neutral" state for a role
   * This clears the bit from both allow_permissions and deny_permissions
   */
  async setPermissionNeutral(roleId: string, permission: bigint): Promise<RoleData> {
    const role = await this.getRole(roleId);
    if (!role) {
      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    }

    const currentAllow = hexToBigint(role.allow_permissions);
    const currentDeny = hexToBigint(role.deny_permissions);

    const newAllow = currentAllow & ~permission;
    const newDeny = currentDeny & ~permission;

    const [updated] = await db('roles')
      .where('id', roleId)
      .update({
        allow_permissions: bigintToHex(newAllow),
        deny_permissions: bigintToHex(newDeny),
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Calculate permissions for a member using three-state model
   * Returns the resolved allow permissions after applying all roles
   */
  async calculateMemberPermissions(serverId: string, userId: string): Promise<bigint> {
    // Get server to check if owner
    const server = await db('servers').where('id', serverId).first();
    if (!server) {
      return 0n;
    }

    // Owner has all permissions
    if (server.owner_id === userId) {
      return ALL_PERMISSIONS;
    }

    // Get member's roles
    const memberRoles = await db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .pluck('role_id');

    // Get @everyone role
    const everyoneRole = await this.getEveryoneRole(serverId);

    // Initialize with @everyone permissions
    let allowPermissions = everyoneRole ? hexToBigint(everyoneRole.allow_permissions) : 0n;
    let denyPermissions = everyoneRole ? hexToBigint(everyoneRole.deny_permissions) : 0n;

    // Get all member's roles sorted by position (highest first)
    if (memberRoles.length > 0) {
      const roles = await db('roles')
        .whereIn('id', memberRoles)
        .where('server_id', serverId)
        .orderBy('position', 'desc');

      for (const role of roles) {
        const roleAllow = hexToBigint(role.allow_permissions);
        const roleDeny = hexToBigint(role.deny_permissions);

        // Three-state resolution:
        // - Higher roles' settings override lower roles
        // - Allow takes precedence when both are set
        allowPermissions = (allowPermissions & ~roleDeny) | roleAllow;
        denyPermissions = (denyPermissions & ~roleAllow) | roleDeny;
      }
    }

    // Check for administrator permission - if set, grant all permissions
    if (Permissions.has(allowPermissions, PERMISSION_FLAGS.ADMINISTRATOR)) {
      return ALL_PERMISSIONS;
    }

    // Return the resolved allow permissions
    // Bits set in deny should be cleared from allow
    return allowPermissions & ~denyPermissions;
  }

  /**
   * Get resolved permissions for a role (for display purposes)
   */
  getResolvedPermissions(role: RoleData): { allow: bigint; deny: bigint; neutral: bigint } {
    const allow = hexToBigint(role.allow_permissions);
    const deny = hexToBigint(role.deny_permissions);

    // Neutral = bits not set in either allow or deny
    const neutral = ALL_PERMISSIONS & ~(allow | deny);

    return { allow, deny, neutral };
  }
}

export const roleService = new RoleService();
