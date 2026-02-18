/**
 * Invite Service
 * Handles server invite management
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION, DEFAULTS } from '@freedomtalk/shared';

export interface InviteWithDetails {
  id: string;
  server_id: string;
  channel_id: string;
  inviter_id: string;
  code: string;
  max_uses: number | null;
  uses: number;
  max_age: number | null;
  temporary: boolean;
  created_at: Date;
  expires_at: Date | null;
  server?: {
    id: string;
    name: string;
    icon_url: string | null;
    member_count: number;
  };
  channel?: {
    id: string;
    name: string;
    type: string;
  };
  inviter?: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

export interface CreateInviteInput {
  serverId: string;
  channelId: string;
  inviterId: string;
  maxUses?: number;
  maxAge?: number;
  temporary?: boolean;
}

class InviteService {
  /**
   * Generate a random invite code
   */
  private generateCode(length: number = VALIDATION.INVITE.CODE_LENGTH): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new invite
   */
  async createInvite(input: CreateInviteInput): Promise<InviteWithDetails> {
    // Verify server exists
    const server = await db('servers').where('id', input.serverId).first();
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    // Verify channel exists and belongs to server
    const channel = await db('channels')
      .where('id', input.channelId)
      .where('server_id', input.serverId)
      .first();

    if (!channel) {
      throw new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel not found in this server');
    }

    // Validate max uses
    if (input.maxUses !== undefined && input.maxUses !== null) {
      if (input.maxUses < 0 || input.maxUses > VALIDATION.INVITE.MAX_USES) {
        throw new AppError(400, 'INVALID_MAX_USES',
          `Max uses must be between 0 and ${VALIDATION.INVITE.MAX_USES}`);
      }
    }

    // Validate max age
    if (input.maxAge !== undefined && input.maxAge !== null) {
      if (input.maxAge < 0 || input.maxAge > VALIDATION.INVITE.MAX_AGE) {
        throw new AppError(400, 'INVALID_MAX_AGE',
          `Max age must be between 0 and ${VALIDATION.INVITE.MAX_AGE} seconds`);
      }
    }

    // Generate unique code
    let code = this.generateCode();
    let attempts = 0;
    while (await this.codeExists(code)) {
      code = this.generateCode();
      attempts++;
      if (attempts > 10) {
        // Increase code length if too many collisions
        code = this.generateCode(VALIDATION.INVITE.MAX_CODE_LENGTH);
        break;
      }
    }

    const inviteId = generateSnowflakeId();
    const maxAge = input.maxAge ?? DEFAULTS.INVITE.MAX_AGE;
    const expiresAt = maxAge > 0
      ? new Date(Date.now() + maxAge * 1000)
      : null;

    await db('invites')
      .insert({
        id: inviteId,
        server_id: input.serverId,
        channel_id: input.channelId,
        inviter_id: input.inviterId,
        code,
        max_uses: input.maxUses ?? (DEFAULTS.INVITE.MAX_USES || null),
        uses: 0,
        max_age: maxAge || null,
        temporary: input.temporary || false,
        expires_at: expiresAt,
      });

    return this.getInviteByCode(code) as Promise<InviteWithDetails>;
  }

  /**
   * Get invite by code
   */
  async getInviteByCode(code: string): Promise<InviteWithDetails | null> {
    const invite = await db('invites')
      .where('code', code)
      .first();

    if (!invite) return null;

    // Get related data
    const [server, channel, inviter] = await Promise.all([
      db('servers').where('id', invite.server_id).first(),
      db('channels').where('id', invite.channel_id).first(),
      db('users')
        .where('users.id', invite.inviter_id)
        .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
        .select('users.id', 'users.username', 'user_profiles.avatar_url as avatar')
        .first(),
    ]);

    return {
      ...invite,
      server: server ? {
        id: server.id,
        name: server.name,
        icon_url: server.icon_url,
        member_count: server.member_count,
      } : undefined,
      channel: channel ? {
        id: channel.id,
        name: channel.name,
        type: channel.type,
      } : undefined,
      inviter: inviter || undefined,
    };
  }

  /**
   * Get invite by ID
   */
  async getInvite(inviteId: string): Promise<InviteWithDetails | null> {
    const invite = await db('invites')
      .where('id', inviteId)
      .first();

    if (!invite) return null;

    return this.getInviteByCode(invite.code);
  }

  /**
   * Get all invites for a server
   */
  async getServerInvites(serverId: string): Promise<InviteWithDetails[]> {
    const invites = await db('invites')
      .where('server_id', serverId)
      .orderBy('created_at', 'desc');

    // Return early if no invites
    if (invites.length === 0) {
      return [];
    }

    // Get related data
    const channelIds = [...new Set(invites.map(i => i.channel_id))];
    const inviterIds = [...new Set(invites.map(i => i.inviter_id))];

    const [channels, inviters, server] = await Promise.all([
      channelIds.length > 0
        ? db('channels').whereIn('id', channelIds).select('id', 'name', 'type')
        : [],
      inviterIds.length > 0
        ? db('users')
            .whereIn('users.id', inviterIds)
            .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
            .select('users.id', 'users.username', 'user_profiles.avatar_url as avatar')
        : [],
      db('servers').where('id', serverId).first(),
    ]);

    const channelMap = new Map(channels.map(c => [c.id, c]));
    const inviterMap = new Map(inviters.map(u => [u.id, u]));

    return invites.map(invite => ({
      ...invite,
      server: server ? {
        id: server.id,
        name: server.name,
        icon_url: server.icon_url,
        member_count: server.member_count,
      } : undefined,
      channel: channelMap.get(invite.channel_id) ? {
        id: invite.channel_id,
        name: channelMap.get(invite.channel_id)!.name,
        type: channelMap.get(invite.channel_id)!.type,
      } : undefined,
      inviter: inviterMap.get(invite.inviter_id) ? {
        id: invite.inviter_id,
        username: inviterMap.get(invite.inviter_id)!.username,
        avatar: inviterMap.get(invite.inviter_id)!.avatar,
      } : undefined,
    }));
  }

  /**
   * Get invites for a channel
   */
  async getChannelInvites(channelId: string): Promise<InviteWithDetails[]> {
    const invites = await db('invites')
      .where('channel_id', channelId)
      .orderBy('created_at', 'desc');

    const results: InviteWithDetails[] = [];
    for (const invite of invites) {
      const full = await this.getInviteByCode(invite.code);
      if (full) results.push(full);
    }
    return results;
  }

  /**
   * Delete an invite
   */
  async deleteInvite(code: string, userId: string): Promise<void> {
    const invite = await db('invites').where('code', code).first();

    if (!invite) {
      throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    // Only inviter or server manager can delete
    const server = await db('servers').where('id', invite.server_id).first();
    if (invite.inviter_id !== userId && server?.owner_id !== userId) {
      // Check for MANAGE_SERVER permission (handled at route level)
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this invite');
    }

    await db('invites').where('code', code).delete();
  }

  /**
   * Use an invite (join server)
   */
  async useInvite(code: string, _userId: string): Promise<InviteWithDetails> {
    const invite = await this.getInviteByCode(code);

    if (!invite) {
      throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new AppError(400, 'INVITE_EXPIRED', 'This invite has expired');
    }

    // Check if max uses reached
    if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
      throw new AppError(400, 'INVITE_MAX_USES', 'This invite has reached its maximum uses');
    }

    // Increment uses
    await db('invites')
      .where('code', code)
      .increment('uses', 1);

    return invite;
  }

  /**
   * Check if a code already exists
   */
  private async codeExists(code: string): Promise<boolean> {
    const invite = await db('invites')
      .where('code', code)
      .first();

    return !!invite;
  }

  /**
   * Clean up expired invites (can be run as a cron job)
   */
  async cleanupExpiredInvites(): Promise<number> {
    const deleted = await db('invites')
      .where('expires_at', '<', new Date())
      .delete();

    return deleted;
  }
}

export const inviteService = new InviteService();
