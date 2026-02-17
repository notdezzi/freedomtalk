/**
 * Role Service
 * Handles server role management
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION, DEFAULTS } from '@freedomtalk/shared';

export interface RoleData {
  id: string;
  server_id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon: string | null;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoleInput {
  serverId: string;
  name: string;
  permissions?: bigint;
  color?: number;
  hoist?: boolean;
  icon?: string;
  mentionable?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  permissions?: bigint;
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

    // Get next position
    const maxPosition = await db('roles')
      .where('server_id', input.serverId)
      .max('position as max')
      .first();

    const position = (maxPosition?.max || 0) + 1;

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
        permissions: (input.permissions || DEFAULTS.ROLE.PERMISSIONS).toString(),
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

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) {
      if (input.name.length < VALIDATION.ROLE.MIN_NAME_LENGTH || input.name.length > VALIDATION.ROLE.MAX_NAME_LENGTH) {
        throw new AppError(400, 'INVALID_NAME',
          `Role name must be between ${VALIDATION.ROLE.MIN_NAME_LENGTH} and ${VALIDATION.ROLE.MAX_NAME_LENGTH} characters`);
      }
      updateData.name = input.name;
    }

    if (input.permissions !== undefined) {
      updateData.permissions = input.permissions.toString();
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
   * Calculate permissions for a member
   */
  async calculateMemberPermissions(serverId: string, userId: string): Promise<bigint> {
    // Get server to check if owner
    const server = await db('servers').where('id', serverId).first();
    if (!server) {
      return 0n;
    }

    // Owner has all permissions
    if (server.owner_id === userId) {
      const { ALL_PERMISSIONS } = await import('@freedomtalk/shared');
      return ALL_PERMISSIONS;
    }

    // Get member's roles
    const memberRoles = await db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .pluck('role_id');

    // Get @everyone role
    const everyoneRole = await this.getEveryoneRole(serverId);
    let permissions = everyoneRole ? BigInt(everyoneRole.permissions) : 0n;

    // Add permissions from member's roles
    if (memberRoles.length > 0) {
      const roles = await db('roles')
        .whereIn('id', memberRoles)
        .where('server_id', serverId);

      for (const role of roles) {
        permissions |= BigInt(role.permissions);
      }
    }

    return permissions;
  }
}

export const roleService = new RoleService();
