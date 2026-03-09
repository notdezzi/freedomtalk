/**
 * Server Service
 * Handles server CRUD operations and management
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION, DEFAULTS, DEFAULT_PERMISSIONS } from '@freedomtalk/shared';

// Helper to convert bigint to hex string for database storage
function bigintToHex(value: bigint): string {
  return '0x' + value.toString(16);
}

export interface CreateServerInput {
  name: string;
  description?: string;
  iconUrl?: string;
  ownerId: string;
}

export interface UpdateServerInput {
  name?: string;
  description?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  splashUrl?: string | null;
  systemChannelId?: string | null;
  rulesChannelId?: string | null;
  publicUpdatesChannelId?: string | null;
  afkChannelId?: string | null;
  afkTimeout?: number;
  preferredLocale?: string;
  nsfw?: boolean;
  vanityUrlCode?: string | null;
}

export interface ServerWithMembers {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  icon_url: string | null;
  banner_url: string | null;
  splash_url: string | null;
  discovery_splash_url: string | null;
  default_role_id: string | null;
  system_channel_id: string | null;
  rules_channel_id: string | null;
  public_updates_channel_id: string | null;
  afk_channel_id: string | null;
  afk_timeout: number;
  nsfw: boolean;
  verified: boolean;
  vanity_url_code: string | null;
  member_count: number;
  max_members: number;
  preferred_locale: string;
  created_at: Date;
  updated_at: Date;
}

class ServerService {
  /**
   * Create a new server with default role and general channel
   */
  async createServer(input: CreateServerInput): Promise<ServerWithMembers> {
    const serverId = generateSnowflakeId();
    const roleId = generateSnowflakeId();
    const textChannelId = generateSnowflakeId();
    const voiceChannelId = generateSnowflakeId();

    // Use transaction to create server, default role, and general channels
    const result = await db.transaction(async (trx) => {
      // Create server WITHOUT default_role_id first (to avoid FK constraint)
      const [server] = await trx('servers').insert({
        id: serverId,
        name: input.name,
        description: input.description || null,
        owner_id: input.ownerId,
        icon_url: input.iconUrl || null,
        banner_url: null,
        splash_url: null,
        discovery_splash_url: null,
        // default_role_id is set AFTER role creation
        system_channel_id: textChannelId,
        rules_channel_id: null,
        public_updates_channel_id: null,
        afk_channel_id: null,
        afk_timeout: DEFAULTS.SERVER.AFK_TIMEOUT,
        nsfw: false,
        verified: false,
        vanity_url_code: null,
        member_count: 1,
        max_members: DEFAULTS.SERVER.MAX_MEMBERS,
        preferred_locale: DEFAULTS.SERVER.PREFERRED_LOCALE,
      }).returning('*');

      // Create @everyone role with default permissions
      await trx('roles').insert({
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
        mentionable: false,
      });

      // Update server with the default role id
      await trx('servers').where('id', serverId).update({
        default_role_id: roleId,
      });

      // Create #general text channel
      await trx('channels').insert({
        id: textChannelId,
        server_id: serverId,
        category_id: null,
        name: 'general',
        type: 'text',
        topic: null,
        position: 0,
        nsfw: false,
        rate_limit_per_user: 0,
        parent_id: null,
        last_message_id: null,
        bitrate: null,
        user_limit: null,
        rtc_region: null,
      });

      // Create #general voice channel
      await trx('channels').insert({
        id: voiceChannelId,
        server_id: serverId,
        category_id: null,
        name: 'General',
        type: 'voice',
        topic: null,
        position: 1,
        nsfw: false,
        rate_limit_per_user: 0,
        parent_id: null,
        last_message_id: null,
        bitrate: 64000,
        user_limit: 0,
        rtc_region: null,
      });

      // Add owner as first member
      const memberId = generateSnowflakeId();
      await trx('server_members').insert({
        id: memberId,
        server_id: serverId,
        user_id: input.ownerId,
        nickname: null,
        avatar_url: null,
        mute: false,
        deaf: false,
        pending: false,
        joined_at: new Date(),
        boosted_since: null,
        communication_disabled_until: null,
      });

      return server;
    });

    return result;
  }

  /**
   * Get server by ID
   */
  async getServer(serverId: string): Promise<ServerWithMembers | null> {
    const server = await db('servers')
      .where('id', serverId)
      .first();

    return server || null;
  }

  /**
   * Update server settings
   */
  async updateServer(serverId: string, input: UpdateServerInput, _userId: string): Promise<ServerWithMembers> {
    const server = await this.getServer(serverId);
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) {
      if (input.name.length < VALIDATION.SERVER_NAME.MIN_LENGTH ||
          input.name.length > VALIDATION.SERVER_NAME.MAX_LENGTH) {
        throw new AppError(400, 'INVALID_NAME', `Server name must be between ${VALIDATION.SERVER_NAME.MIN_LENGTH} and ${VALIDATION.SERVER_NAME.MAX_LENGTH} characters`);
      }
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      if (input.description && input.description.length > VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH) {
        throw new AppError(400, 'INVALID_DESCRIPTION', `Description must be at most ${VALIDATION.SERVER_DESCRIPTION.MAX_LENGTH} characters`);
      }
      updateData.description = input.description;
    }
    if (input.iconUrl !== undefined) updateData.icon_url = input.iconUrl;
    if (input.bannerUrl !== undefined) updateData.banner_url = input.bannerUrl;
    if (input.splashUrl !== undefined) updateData.splash_url = input.splashUrl;
    if (input.systemChannelId !== undefined) updateData.system_channel_id = input.systemChannelId;
    if (input.rulesChannelId !== undefined) updateData.rules_channel_id = input.rulesChannelId;
    if (input.publicUpdatesChannelId !== undefined) updateData.public_updates_channel_id = input.publicUpdatesChannelId;
    if (input.afkChannelId !== undefined) updateData.afk_channel_id = input.afkChannelId;
    if (input.afkTimeout !== undefined) updateData.afk_timeout = input.afkTimeout;
    if (input.preferredLocale !== undefined) updateData.preferred_locale = input.preferredLocale;
    if (input.nsfw !== undefined) updateData.nsfw = input.nsfw;
    if (input.vanityUrlCode !== undefined) updateData.vanity_url_code = input.vanityUrlCode;

    const [updated] = await db('servers')
      .where('id', serverId)
      .update(updateData)
      .returning('*');

    return updated;
  }

  /**
   * Delete server (owner only)
   */
  async deleteServer(serverId: string, userId: string): Promise<void> {
    const server = await this.getServer(serverId);
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    if (server.owner_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the server owner can delete the server');
    }

    await db('servers').where('id', serverId).delete();
  }

  /**
   * Get all servers a user is a member of
   */
  async getUserServers(userId: string): Promise<ServerWithMembers[]> {
    const servers = await db('servers')
      .join('server_members', 'servers.id', 'server_members.server_id')
      .where('server_members.user_id', userId)
      .select('servers.*')
      .orderBy('servers.position', 'asc');

    return servers;
  }

  /**
   * Check if user is a member of a server
   */
  async isMember(serverId: string, userId: string): Promise<boolean> {
    const member = await db('server_members')
      .where('server_id', serverId)
      .where('user_id', userId)
      .first();

    return !!member;
  }

  /**
   * Check if user is owner of a server
   */
  async isOwner(serverId: string, userId: string): Promise<boolean> {
    const server = await db('servers')
      .where('id', serverId)
      .where('owner_id', userId)
      .first();

    return !!server;
  }

  /**
   * Update member count cache
   */
  async updateMemberCount(serverId: string): Promise<void> {
    const count = await db('server_members')
      .where('server_id', serverId)
      .count('id as count')
      .first();

    await db('servers')
      .where('id', serverId)
      .update({
        member_count: count?.count || 0,
        updated_at: new Date(),
      });
  }

  /**
   * Transfer server ownership
   */
  async transferOwnership(serverId: string, currentOwnerId: string, newOwnerId: string): Promise<ServerWithMembers> {
    const server = await this.getServer(serverId);
    if (!server) {
      throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
    }

    if (server.owner_id !== currentOwnerId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the server owner can transfer ownership');
    }

    // Verify new owner is a member
    const newOwnerMember = await db('server_members')
      .where('server_id', serverId)
      .where('user_id', newOwnerId)
      .first();

    if (!newOwnerMember) {
      throw new AppError(400, 'NOT_A_MEMBER', 'The new owner must be a member of the server');
    }

    const [updated] = await db('servers')
      .where('id', serverId)
      .update({
        owner_id: newOwnerId,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Update server positions for a user
   */
  async updateServerPositions(userId: string, positions: { id: string; position: number }[]): Promise<ServerWithMembers[]> {
    // Verify user is a member of all servers being updated
    const serverIds = positions.map(p => p.id);
    const memberships = await db('server_members')
      .where('user_id', userId)
      .whereIn('server_id', serverIds)
      .count('id as count')
      .first();

    if (!memberships || Number(memberships.count) !== serverIds.length) {
      throw new AppError(400, 'INVALID_SERVERS', 'One or more servers are not accessible by the user');
    }

    // Update positions in a transaction
    await db.transaction(async (trx) => {
      for (const { id, position } of positions) {
        await trx('servers')
          .where('id', id)
          .update({ position, updated_at: new Date() });
      }
    });

    // Return updated servers
    return this.getUserServers(userId);
  }

  /**
   * Get server by vanity URL code
   */
  async getServerByVanityUrl(vanityCode: string): Promise<ServerWithMembers | null> {
    const server = await db('servers')
      .where('vanity_url_code', vanityCode)
      .first();

    return server || null;
  }

  /**
   * Check if a vanity URL code is available
   * Returns true if the code is not used by any other server
   */
  async checkVanityUrlAvailability(serverId: string, code: string): Promise<boolean> {
    const existingServer = await db('servers')
      .where('vanity_url_code', code)
      .whereNot('id', serverId)
      .first();

    return !existingServer;
  }
}

export const serverService = new ServerService();
