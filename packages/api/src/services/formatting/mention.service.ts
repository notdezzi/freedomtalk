/**
 * Mention Parsing Service
 * Parses and validates Discord-style mentions in messages
 */

import { logger } from '../../config/logger';
import { db } from '../../config/database';

/**
 * Mention types
 */
export type MentionType = 'user' | 'role' | 'channel' | 'everyone' | 'here';

/**
 * Parsed mention
 */
export interface ParsedMention {
  type: MentionType;
  id?: string; // Snowflake ID for user/role/channel
  raw: string; // Original mention string
}

/**
 * Mention validation result
 */
export interface MentionValidationResult {
  valid: boolean;
  invalidMentions: ParsedMention[];
  errors: string[];
}

/**
 * Regex patterns for mention types
 */
const MENTION_PATTERNS = {
  // User mention: <@123456789012345678>
  user: /<@(\d{20})>/g,
  // Role mention: <@&123456789012345678>
  role: /<@&(\d{20})>/g,
  // Channel mention: <#123456789012345678>
  channel: /<#(\d{20})>/g,
  // Everyone mention: @everyone
  everyone: /@everyone/g,
  // Here mention: @here
  here: /@here/g,
};

/**
 * Mention Service class
 */
class MentionService {
  /**
   * Parse all mentions from message content
   * @param content - Message content
   * @returns Array of parsed mentions
   */
  parseMentions(content: string): ParsedMention[] {
    const mentions: ParsedMention[] = [];

    try {
      // Parse user mentions
      let match: RegExpExecArray | null;
      const userPattern = new RegExp(MENTION_PATTERNS.user.source, 'g');
      while ((match = userPattern.exec(content)) !== null) {
        mentions.push({
          type: 'user',
          id: match[1],
          raw: match[0],
        });
      }

      // Parse role mentions
      const rolePattern = new RegExp(MENTION_PATTERNS.role.source, 'g');
      while ((match = rolePattern.exec(content)) !== null) {
        mentions.push({
          type: 'role',
          id: match[1],
          raw: match[0],
        });
      }

      // Parse channel mentions
      const channelPattern = new RegExp(MENTION_PATTERNS.channel.source, 'g');
      while ((match = channelPattern.exec(content)) !== null) {
        mentions.push({
          type: 'channel',
          id: match[1],
          raw: match[0],
        });
      }

      // Parse everyone mentions
      const everyonePattern = new RegExp(MENTION_PATTERNS.everyone.source, 'g');
      while ((match = everyonePattern.exec(content)) !== null) {
        mentions.push({
          type: 'everyone',
          raw: match[0],
        });
      }

      // Parse here mentions
      const herePattern = new RegExp(MENTION_PATTERNS.here.source, 'g');
      while ((match = herePattern.exec(content)) !== null) {
        mentions.push({
          type: 'here',
          raw: match[0],
        });
      }

      return mentions;
    } catch (error) {
      logger.error({ error, contentLength: content.length }, 'Error parsing mentions');
      return [];
    }
  }

  /**
   * Validate mentions against database
   * @param mentions - Parsed mentions to validate
   * @param channelId - Channel context for permission checking
   * @param serverId - Server context for role/channel validation
   * @returns Validation result
   */
  async validateMentions(
    mentions: ParsedMention[],
    channelId?: string,
    serverId?: string
  ): Promise<MentionValidationResult> {
    const result: MentionValidationResult = {
      valid: true,
      invalidMentions: [],
      errors: [],
    };

    try {
      // Separate mentions by type for batch validation
      const userIds = mentions.filter(m => m.type === 'user' && m.id).map(m => m.id!);
      const roleIds = mentions.filter(m => m.type === 'role' && m.id).map(m => m.id!);
      const channelIds = mentions.filter(m => m.type === 'channel' && m.id).map(m => m.id!);

      // Validate user mentions
      if (userIds.length > 0) {
        const existingUsers = await db('users')
          .whereIn('id', userIds)
          .pluck('id');

        const invalidUserIds = userIds.filter(id => !existingUsers.includes(id));
        for (const id of invalidUserIds) {
          const mention = mentions.find(m => m.type === 'user' && m.id === id);
          if (mention) {
            result.invalidMentions.push(mention);
            result.errors.push(`User ${id} does not exist`);
          }
        }

        // If server context provided, check membership
        if (serverId && channelId) {
          const serverMemberIds = await db('server_members')
            .where('server_id', serverId)
            .whereIn('user_id', userIds)
            .pluck('user_id');

          const nonMemberIds = userIds.filter(
            id => existingUsers.includes(id) && !serverMemberIds.includes(id)
          );
          for (const id of nonMemberIds) {
            result.errors.push(`User ${id} is not a member of this server`);
          }
        }
      }

      // Validate role mentions (requires server context)
      if (roleIds.length > 0 && serverId) {
        const existingRoles = await db('roles')
          .where('server_id', serverId)
          .whereIn('id', roleIds)
          .pluck('id');

        const invalidRoleIds = roleIds.filter(id => !existingRoles.includes(id));
        for (const id of invalidRoleIds) {
          const mention = mentions.find(m => m.type === 'role' && m.id === id);
          if (mention) {
            result.invalidMentions.push(mention);
            result.errors.push(`Role ${id} does not exist in this server`);
          }
        }
      } else if (roleIds.length > 0 && !serverId) {
        // Role mentions in DM context are invalid
        for (const mention of mentions.filter(m => m.type === 'role')) {
          result.invalidMentions.push(mention);
          result.errors.push('Role mentions are not allowed in DMs');
        }
      }

      // Validate channel mentions (requires server context)
      if (channelIds.length > 0 && serverId) {
        const existingChannels = await db('channels')
          .where('server_id', serverId)
          .whereIn('id', channelIds)
          .pluck('id');

        const invalidChannelIds = channelIds.filter(id => !existingChannels.includes(id));
        for (const id of invalidChannelIds) {
          const mention = mentions.find(m => m.type === 'channel' && m.id === id);
          if (mention) {
            result.invalidMentions.push(mention);
            result.errors.push(`Channel ${id} does not exist in this server`);
          }
        }
      } else if (channelIds.length > 0 && !serverId) {
        // Channel mentions in DM context might be valid cross-server mentions
        // For now, we'll allow them but log a warning
        logger.debug({ channelIds }, 'Channel mentions in DM context');
      }

      result.valid = result.invalidMentions.length === 0;
      return result;
    } catch (error) {
      logger.error({ error }, 'Error validating mentions');
      result.valid = false;
      result.errors.push('Failed to validate mentions');
      return result;
    }
  }

  /**
   * Get mentioned user IDs for notifications
   * @param content - Message content
   * @param _channelId - Channel context (unused, kept for API consistency)
   * @param serverId - Server context
   * @returns Array of user IDs to notify
   */
  async getMentionedUsers(
    content: string,
    _channelId?: string,
    serverId?: string
  ): Promise<string[]> {
    const mentions = this.parseMentions(content);
    const userIds = new Set<string>();

    try {
      // Add directly mentioned users
      for (const mention of mentions) {
        if (mention.type === 'user' && mention.id) {
          userIds.add(mention.id);
        }
      }

      // For @everyone and @here, get all server/online members
      const hasEveryone = mentions.some(m => m.type === 'everyone');
      const hasHere = mentions.some(m => m.type === 'here');

      if ((hasEveryone || hasHere) && serverId) {
        let query = db('server_members')
          .where('server_id', serverId);

        // @here only mentions online users
        if (hasHere && !hasEveryone) {
          // Get online users from Redis presence data
          // For now, we'll get all members - presence filtering is done at notification time
          query = query.whereNotNull('user_id');
        }

        const memberUserIds = await query.pluck('user_id');
        for (const id of memberUserIds) {
          userIds.add(id);
        }
      }

      return Array.from(userIds);
    } catch (error) {
      logger.error({ error }, 'Error getting mentioned users');
      return Array.from(userIds);
    }
  }

  /**
   * Replace mention IDs with display names
   * @param content - Message content with mentions
   * @param serverId - Server context for display names
   * @returns Content with mentions replaced by names
   */
  async replaceMentionsWithNames(content: string, serverId?: string): Promise<string> {
    const mentions = this.parseMentions(content);
    let result = content;

    try {
      // Replace user mentions with display names
      const userMentions = mentions.filter(m => m.type === 'user' && m.id);
      if (userMentions.length > 0) {
        const userIds = userMentions.map(m => m.id!);
        const users = await db('users')
          .whereIn('id', userIds)
          .select('id', 'username', 'display_name');

        const userMap = new Map(users.map(u => [u.id, u.display_name || u.username]));

        for (const mention of userMentions) {
          if (mention.id) {
            const name = userMap.get(mention.id) || 'Unknown User';
            result = result.replace(mention.raw, `@${name}`);
          }
        }
      }

      // Replace role mentions with role names
      const roleMentions = mentions.filter(m => m.type === 'role' && m.id);
      if (roleMentions.length > 0 && serverId) {
        const roleIds = roleMentions.map(m => m.id!);
        const roles = await db('roles')
          .where('server_id', serverId)
          .whereIn('id', roleIds)
          .select('id', 'name');

        const roleMap = new Map(roles.map(r => [r.id, r.name]));

        for (const mention of roleMentions) {
          if (mention.id) {
            const name = roleMap.get(mention.id) || 'Unknown Role';
            result = result.replace(mention.raw, `@${name}`);
          }
        }
      }

      // Replace channel mentions with channel names
      const channelMentions = mentions.filter(m => m.type === 'channel' && m.id);
      if (channelMentions.length > 0 && serverId) {
        const channelIds = channelMentions.map(m => m.id!);
        const channels = await db('channels')
          .where('server_id', serverId)
          .whereIn('id', channelIds)
          .select('id', 'name');

        const channelMap = new Map(channels.map(c => [c.id, c.name]));

        for (const mention of channelMentions) {
          if (mention.id) {
            const name = channelMap.get(mention.id) || 'Unknown Channel';
            result = result.replace(mention.raw, `#${name}`);
          }
        }
      }

      // @everyone and @here stay as-is
      return result;
    } catch (error) {
      logger.error({ error }, 'Error replacing mentions with names');
      return content;
    }
  }

  /**
   * Suppress/escape mentions in content
   * @param content - Message content
   * @returns Content with escaped mentions
   */
  suppressMentions(content: string): string {
    let result = content;

    // Escape user mentions: <@123> -> \<@123\>
    result = result.replace(/<@(\d{20})>/g, '\\<@$1\\>');

    // Escape role mentions: <@&123> -> \<@&123\>
    result = result.replace(/<@&(\d{20})>/g, '\\<@&$1\\>');

    // Escape channel mentions: <#123> -> \<#123\>
    result = result.replace(/<#(\d{20})>/g, '\\<#$1\\>');

    // Escape @everyone and @here
    result = result.replace(/@everyone/g, '@\u200Beveryone');
    result = result.replace(/@here/g, '@\u200Bhere');

    return result;
  }

  /**
   * Check if content contains mentions that should trigger notifications
   * @param content - Message content
   * @param userId - User to check for
   * @returns True if user should be notified
   */
  shouldNotifyUser(content: string, userId: string): boolean {
    const mentions = this.parseMentions(content);

    // Check for direct user mention
    if (mentions.some(m => m.type === 'user' && m.id === userId)) {
      return true;
    }

    // @everyone and @here are handled separately based on permissions
    return false;
  }

  /**
   * Count mentions in content
   * @param content - Message content
   * @returns Mention counts by type
   */
  countMentions(content: string): Record<MentionType, number> {
    const mentions = this.parseMentions(content);
    const counts: Record<MentionType, number> = {
      user: 0,
      role: 0,
      channel: 0,
      everyone: 0,
      here: 0,
    };

    for (const mention of mentions) {
      counts[mention.type]++;
    }

    return counts;
  }
}

// Export singleton instance
export const mentionService = new MentionService();
