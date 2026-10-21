/**
 * Server Member Service
 * Handles server membership management
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';
import { VALIDATION, WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from '../websocket/websocket.server';
import {
  assertCanModerateMember,
  assertCanAssignRoles,
} from './hierarchy';

export interface ServerMemberWithUser {
  id: string;
  server_id: string;
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  mute: boolean;
  deaf: boolean;
  pending: boolean;
  joined_at: Date;
  boosted_since: Date | null;
  communication_disabled_until: string | null;
  created_at: Date;
  updated_at: Date;
  is_owner?: boolean;
  user?: {
    id: string;
    username: string;
    avatar: string | null;
  };
  roles?: Array<{
    id: string;
    name: string;
    color: number;
    position: number;
  }>;
}

export interface UpdateMemberInput {
  nickname?: string | null;
  avatarUrl?: string | null;
  mute?: boolean;
  deaf?: boolean;
  communicationDisabledUntil?: string | null;
}

export interface AddMemberInput {
  serverId: string;
  userId: string;
  pending?: boolean;
}

class ServerMemberService {
  /**
   * Emit a WebSocket event to a server room
   */
  private emitToServer(serverId: string, event: string, data: any): void {
    try {
      if (wsServer.isInitialized()) {
        const io = wsServer.getIO();
        io.to(`server:${serverId}`).emit(event, data);
      }
    } catch (error) {
      // Don't fail the operation if WebSocket emission fails
      logger.error({ error }, 'Failed to emit WebSocket event');
    }
  }

  /**
   * Emit a WebSocket event to a specific user
   */
  private emitToUser(userId: string, event: string, data: any): void {
    try {
      if (wsServer.isInitialized()) {
        const io = wsServer.getIO();
        io.to(`user:${userId}`).emit(event, data);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to emit WebSocket event to user');
    }
  }

  /**
   * Add a member to a server
   */
  async addMember(input: AddMemberInput): Promise<ServerMemberWithUser> {
    // Check if server exists
    const server = await db('servers').where('id', input.serverId).first();
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    // Check if user is already a member
    const existingMember = await db('server_members')
      .where('server_id', input.serverId)
      .where('user_id', input.userId)
      .first();

    if (existingMember) {
      throw new AppError(400, 'ALREADY_A_MEMBER', 'User is already a member of this server');
    }

    // Check if user is banned
    const ban = await db('server_bans')
      .where('server_id', input.serverId)
      .where('user_id', input.userId)
      .first();

    if (ban) {
      throw new AppError(403, 'USER_BANNED', 'User is banned from this server');
    }

    // Check server member limit
    if (server.member_count >= server.max_members) {
      throw new AppError(403, 'SERVER_FULL', 'Server has reached maximum member limit');
    }

    const memberId = generateSnowflakeId();
    const [member] = await db('server_members')
      .insert({
        id: memberId,
        server_id: input.serverId,
        user_id: input.userId,
        nickname: null,
        avatar_url: null,
        mute: false,
        deaf: false,
        pending: input.pending || false,
        joined_at: new Date(),
        boosted_since: null,
        communication_disabled_until: null,
      })
      .returning('*');

    // Update member count
    await db('servers')
      .where('id', input.serverId)
      .increment('member_count', 1);

    // Get the full member info with user and roles
    const fullMember = await this.getMember(input.serverId, input.userId);

    // Emit SERVER_MEMBER_ADD event to server room
    if (fullMember) {
      this.emitToServer(input.serverId, WS_EVENTS.SERVER_MEMBER_ADD, {
        serverId: input.serverId,
        member: fullMember,
      });
    }

    // Emit SERVER_ADD event to the user who joined
    this.emitToUser(input.userId, WS_EVENTS.SERVER_ADD, {
      server: {
        id: server.id,
        name: server.name,
        icon_url: server.icon_url,
        owner_id: server.owner_id,
        member_count: server.member_count + 1,
      },
    });

    return member;
  }

  /**
   * Remove a member from a server (leave or kick)
   */
  async removeMember(serverId: string, userId: string, requesterId: string): Promise<void> {
    const server = await db('servers').where('id', serverId).first();
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    // Hierarchy: kicking someone else requires the requester to outrank the
    // target; the owner can never be kicked.
    if (userId !== requesterId) {
      await assertCanModerateMember(serverId, requesterId, userId);

      const member = await this.getMember(serverId, userId);
      if (!member) {
        throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
      }
    }

    const deleted = await db.transaction(async (trx) => {
      const deletedRows = await trx('server_members')
        .where('server_id', serverId)
        .where('user_id', userId)
        .delete();

      if (deletedRows) {
        // Clean up member roles atomically with membership removal
        await trx('member_roles')
          .where('server_id', serverId)
          .where('user_id', userId)
          .delete();

        await trx('servers')
          .where('id', serverId)
          .decrement('member_count', 1);
      }

      return deletedRows;
    });

    if (deleted) {
      // Emit SERVER_MEMBER_REMOVE event to server room
      this.emitToServer(serverId, WS_EVENTS.SERVER_MEMBER_REMOVE, {
        serverId,
        userId,
      });

      // Emit SERVER_REMOVE event to the user who left/was kicked
      this.emitToUser(userId, WS_EVENTS.SERVER_REMOVE, {
        serverId,
      });

      // SECURITY: remove the target's live sockets from this server's rooms
      // so a kicked member stops receiving server traffic immediately.
      try {
        if (wsServer.isInitialized()) {
          const io = wsServer.getIO();
          const { connectionManager } = await import('../websocket/connection.manager');
          const socketIds = connectionManager.getUserConnections(userId);
          for (const socketId of socketIds) {
            const socket = io.sockets.sockets.get(socketId);
            if (!socket) {
              continue;
            }
            for (const room of [...socket.rooms]) {
              let shouldLeave = false;
              if (room === `server:${serverId}`) {
                shouldLeave = true;
              } else if (room.startsWith('channel:')) {
                const channel = await db('channels')
                  .where('id', room.slice('channel:'.length))
                  .where('server_id', serverId)
                  .first();
                shouldLeave = !!channel;
              }
              if (shouldLeave) {
                socket.leave(room);
              }
            }
          }
        }
      } catch (error) {
        logger.error({ error }, 'Failed to remove kicked member from server rooms');
      }
    }
  }

  /**
   * Get a member's info
   */
  async getMember(serverId: string, userId: string): Promise<ServerMemberWithUser | null> {
    const member = await db('server_members')
      .where('server_id', serverId)
      .where('user_id', userId)
      .first();

    if (!member) return null;

    // Get server to check owner
    const server = await db('servers').where('id', serverId).first();
    const isOwner = server?.owner_id === userId;

    // Get user info with profile
    const user = await db('users')
      .where('users.id', userId)
      .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
      .select('users.id', 'users.username', 'user_profiles.avatar_url as avatar')
      .first();

    // Get member roles
    const roles = await db('member_roles')
      .where('member_roles.server_id', serverId)
      .where('member_roles.user_id', userId)
      .join('roles', 'member_roles.role_id', 'roles.id')
      .select('roles.id', 'roles.name', 'roles.color', 'roles.position')
      .orderBy('roles.position', 'desc');

    return {
      ...member,
      is_owner: isOwner,
      user: user || undefined,
      roles: roles || [],
    };
  }

  /**
   * Get all members of a server
   */
  async getMembers(serverId: string, options?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ members: ServerMemberWithUser[]; total: number }> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    // Get server to check owner
    const server = await db('servers').where('id', serverId).first();

    let query = db('server_members')
      .where('server_members.server_id', serverId)
      .join('users', 'server_members.user_id', 'users.id')
      .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id');

    if (options?.search) {
      query = query.where(function() {
        this.where('users.username', 'ilike', `%${options.search}%`)
          .orWhere('server_members.nickname', 'ilike', `%${options.search}%`);
      });
    }

    // Get total count
    const countQuery = query.clone();
    const countResult = await countQuery.count('server_members.id as count').first();
    const total = parseInt(String(countResult?.count || 0), 10);

    // Get paginated members
    const members = await query
      .select(
        'server_members.*',
        'users.id as user_id',
        'users.username as user_username',
        'user_profiles.avatar_url as user_avatar',
        'user_profiles.display_name as user_display_name',
        'user_profiles.bio as user_bio',
        'user_profiles.banner_url as user_banner_url'
      )
      .orderBy('server_members.joined_at', 'asc')
      .limit(limit)
      .offset(offset);

    // Get roles for all members
    const userIds = members.map(m => m.user_id);
    const allRoles = userIds.length > 0 ? await db('member_roles')
      .whereIn('member_roles.user_id', userIds)
      .where('member_roles.server_id', serverId)
      .join('roles', 'member_roles.role_id', 'roles.id')
      .select('member_roles.user_id', 'roles.id', 'roles.name', 'roles.color', 'roles.position')
      .orderBy('roles.position', 'desc') : [];

    // Group roles by user
    const rolesByUser: Record<string, typeof allRoles> = {};
    for (const role of allRoles) {
      const userId = role.user_id;
      if (!rolesByUser[userId]) {
        rolesByUser[userId] = [];
      }
      rolesByUser[userId].push(role);
    }

    // Get presence data for all users
    let presenceMap: Map<string, 'online' | 'offline'> = new Map();
    try {
      const { presenceManager } = await import('../websocket/presence.manager');
      presenceMap = await presenceManager.getBulkPresence(userIds);
    } catch (error) {
      // Presence manager may not be available, default all to offline
      userIds.forEach(id => presenceMap.set(id, 'offline'));
    }

    // Format response with camelCase keys for frontend compatibility
    const formattedMembers: ServerMemberWithUser[] = members.map(m => {
      const presence = presenceMap.get(m.user_id) || 'offline';
      return {
        id: m.id,
        server_id: m.server_id,
        user_id: m.user_id,
        nickname: m.nickname,
        avatar_url: m.avatar_url,
        mute: m.mute,
        deaf: m.deaf,
        pending: m.pending,
        joined_at: m.joined_at,
        boosted_since: m.boosted_since,
        communication_disabled_until: m.communication_disabled_until,
        created_at: m.created_at,
        updated_at: m.updated_at,
        is_owner: server?.owner_id === m.user_id,
        user: {
          id: m.user_id,
          username: m.user_username,
          avatar: m.user_avatar,
        },
        roles: rolesByUser[m.user_id] || [],
        // Presence data for frontend
        isOnline: presence === 'online',
        status: presence,
        // Additional profile fields
        display_name: m.user_display_name,
        bio: m.user_bio,
        banner_url: m.user_banner_url,
      };
    });

    return { members: formattedMembers, total };
  }

  /**
   * Update a member's settings
   */
  async updateMember(serverId: string, userId: string, input: UpdateMemberInput): Promise<ServerMemberWithUser> {
    const member = await this.getMember(serverId, userId);
    if (!member) {
      throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.nickname !== undefined) {
      if (input.nickname !== null) {
        if (input.nickname.length < VALIDATION.NICKNAME.MIN_LENGTH ||
            input.nickname.length > VALIDATION.NICKNAME.MAX_LENGTH) {
          throw new AppError(400, 'INVALID_NICKNAME',
            `Nickname must be between ${VALIDATION.NICKNAME.MIN_LENGTH} and ${VALIDATION.NICKNAME.MAX_LENGTH} characters`);
        }
      }
      updateData.nickname = input.nickname;
    }
    if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
    if (input.mute !== undefined) updateData.mute = input.mute;
    if (input.deaf !== undefined) updateData.deaf = input.deaf;
    if (input.communicationDisabledUntil !== undefined) {
      updateData.communication_disabled_until = input.communicationDisabledUntil;
    }

    await db('server_members')
      .where('server_id', serverId)
      .where('user_id', userId)
      .update(updateData);

    return this.getMember(serverId, userId) as Promise<ServerMemberWithUser>;
  }

  /**
   * Add a role to a member
   */
  async addRole(serverId: string, userId: string, roleId: string): Promise<void> {
    // Verify role exists in server
    const role = await db('roles')
      .where('id', roleId)
      .where('server_id', serverId)
      .first();

    if (!role) {
      throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found in this server');
    }

    // Check if member already has the role
    const existing = await db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .where('role_id', roleId)
      .first();

    if (existing) {
      return; // Already has the role
    }

    await db('member_roles').insert({
      server_id: serverId,
      user_id: userId,
      role_id: roleId,
      assigned_at: new Date(),
    });
  }

  /**
   * Remove a role from a member
   */
  async removeRole(serverId: string, userId: string, roleId: string): Promise<void> {
    await db('member_roles')
      .where('server_id', serverId)
      .where('user_id', userId)
      .where('role_id', roleId)
      .delete();
  }

  /**
   * Set member's roles (replace all)
   *
   * Enforces: roles belong to this server, the target is not the owner, the
   * actor outranks the target, and no assigned role sits at/above the
   * actor's highest position (ADMINISTRATOR roles require actor ADMINISTRATOR).
   */
  async setRoles(serverId: string, userId: string, roleIds: string[], actorId?: string): Promise<void> {
    // All roles must exist in this server and satisfy hierarchy rules.
    // Dedupe to keep the count check in assertCanAssignRoles accurate.
    const uniqueRoleIds = [...new Set(roleIds)];
    if (actorId) {
      await assertCanModerateMember(serverId, actorId, userId);
      await assertCanAssignRoles(serverId, actorId, uniqueRoleIds);
    } else {
      // Legacy callers without an actor: still enforce server binding.
      const count = await db('roles')
        .whereIn('id', uniqueRoleIds)
        .where('server_id', serverId)
        .count('id as count')
        .first();
      if (count && parseInt(count.count as string, 10) !== uniqueRoleIds.length) {
        throw new AppError(400, 'INVALID_ROLES', 'One or more roles do not belong to this server');
      }
    }

    await db.transaction(async (trx) => {
      // Remove all existing roles
      await trx('member_roles')
        .where('server_id', serverId)
        .where('user_id', userId)
        .delete();

      // Add new roles
      if (uniqueRoleIds.length > 0) {
        const roleInserts = uniqueRoleIds.map(roleId => ({
          server_id: serverId,
          user_id: userId,
          role_id: roleId,
          assigned_at: new Date(),
        }));

        await trx('member_roles').insert(roleInserts);
      }
    });
  }
}

export const serverMemberService = new ServerMemberService();
