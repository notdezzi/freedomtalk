/**
 * Server Ban Service
 * Handles server ban management
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from '../websocket/websocket.server';

export interface ServerBanWithUser {
  id: string;
  server_id: string;
  user_id: string;
  reason: string | null;
  banned_by: string;
  created_at: Date;
  user?: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

export interface CreateBanInput {
  serverId: string;
  userId: string;
  reason?: string;
  bannedBy: string;
  deleteMessageDays?: number;
}

class ServerBanService {
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
      console.error('Failed to emit WebSocket event:', error);
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
      console.error('Failed to emit WebSocket event to user:', error);
    }
  }

  /**
   * Ban a user from a server
   */
  async createBan(input: CreateBanInput): Promise<ServerBanWithUser> {
    // Check if server exists
    const server = await db('servers').where('id', input.serverId).first();
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    // Note: Server owners CAN be banned by other administrators
    // This allows for full moderation capabilities

    // Check if user exists
    const user = await db('users').where('id', input.userId).first();
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Check if already banned
    const existingBan = await db('server_bans')
      .where('server_id', input.serverId)
      .where('user_id', input.userId)
      .first();

    if (existingBan) {
      throw new AppError(400, 'ALREADY_BANNED', 'User is already banned from this server');
    }

    const banId = generateSnowflakeId();

    await db.transaction(async (trx) => {
      // Create ban
      await trx('server_bans')
        .insert({
          id: banId,
          server_id: input.serverId,
          user_id: input.userId,
          reason: input.reason || null,
          banned_by: input.bannedBy,
        });

      // Remove member if they are in the server
      const deleted = await trx('server_members')
        .where('server_id', input.serverId)
        .where('user_id', input.userId)
        .delete();

      if (deleted) {
        // Clean up member roles
        await trx('member_roles')
          .where('server_id', input.serverId)
          .where('user_id', input.userId)
          .delete();

        // Update member count
        await trx('servers')
          .where('id', input.serverId)
          .decrement('member_count', 1);
      }

      // Optionally delete messages (simplified - in production, this would be a background job)
      // For now, we skip message deletion for performance
    });

    // Emit events after successful transaction
    // Emit SERVER_MEMBER_REMOVE event to server room
    this.emitToServer(input.serverId, WS_EVENTS.SERVER_MEMBER_REMOVE, {
      serverId: input.serverId,
      userId: input.userId,
    });

    // Emit SERVER_BAN_ADD event to server room
    const ban = await this.getBan(input.serverId, input.userId);
    if (ban) {
      this.emitToServer(input.serverId, WS_EVENTS.SERVER_BAN_ADD, {
        serverId: input.serverId,
        userId: input.userId,
        ban,
      });
    }

    // Emit SERVER_REMOVE event to the banned user
    this.emitToUser(input.userId, WS_EVENTS.SERVER_REMOVE, {
      serverId: input.serverId,
    });

    return ban as ServerBanWithUser;
  }

  /**
   * Remove a ban
   */
  async removeBan(serverId: string, userId: string): Promise<void> {
    const ban = await db('server_bans')
      .where('server_id', serverId)
      .where('user_id', userId)
      .first();

    if (!ban) {
      throw new AppError(404, 'BAN_NOT_FOUND', 'Ban not found');
    }

    await db('server_bans')
      .where('server_id', serverId)
      .where('user_id', userId)
      .delete();

    // Emit SERVER_BAN_REMOVE event to server room
    this.emitToServer(serverId, WS_EVENTS.SERVER_BAN_REMOVE, {
      serverId,
      userId,
    });
  }

  /**
   * Get a specific ban
   */
  async getBan(serverId: string, userId: string): Promise<ServerBanWithUser | null> {
    const ban = await db('server_bans')
      .where('server_id', serverId)
      .where('user_id', userId)
      .first();

    if (!ban) return null;

    const user = await db('users')
      .where('users.id', userId)
      .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
      .select('users.id', 'users.username', 'user_profiles.avatar_url as avatar')
      .first();

    return {
      ...ban,
      user: user || undefined,
    };
  }

  /**
   * Get all bans for a server
   */
  async getBans(serverId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ bans: ServerBanWithUser[]; total: number }> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    // Get total count
    const countResult = await db('server_bans')
      .where('server_id', serverId)
      .count('id as count')
      .first();
    const total = parseInt(String(countResult?.count || 0), 10);

    // Get paginated bans
    const bans = await db('server_bans')
      .where('server_id', serverId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get user info for each ban
    const userIds = bans.map(b => b.user_id);
    const users = await db('users')
      .whereIn('users.id', userIds)
      .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
      .select('users.id', 'users.username', 'user_profiles.avatar_url as avatar');

    const userMap = new Map(users.map(u => [u.id, u]));

    const formattedBans: ServerBanWithUser[] = bans.map(ban => ({
      ...ban,
      user: userMap.get(ban.user_id) ? {
        id: ban.user_id,
        username: userMap.get(ban.user_id)!.username,
        avatar: userMap.get(ban.user_id)!.avatar,
      } : undefined,
    }));

    return { bans: formattedBans, total };
  }

  /**
   * Check if a user is banned from a server
   */
  async isBanned(serverId: string, userId: string): Promise<boolean> {
    const ban = await db('server_bans')
      .where('server_id', serverId)
      .where('user_id', userId)
      .first();

    return !!ban;
  }
}

export const serverBanService = new ServerBanService();
