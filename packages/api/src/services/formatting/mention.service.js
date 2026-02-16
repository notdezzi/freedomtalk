import { logger } from '../../config/logger';
import { db } from '../../config/database';
const MENTION_PATTERNS = {
    user: /<@(\d{20})>/g,
    role: /<@&(\d{20})>/g,
    channel: /<#(\d{20})>/g,
    everyone: /@everyone/g,
    here: /@here/g,
};
class MentionService {
    parseMentions(content) {
        const mentions = [];
        try {
            let match;
            const userPattern = new RegExp(MENTION_PATTERNS.user.source, 'g');
            while ((match = userPattern.exec(content)) !== null) {
                mentions.push({
                    type: 'user',
                    id: match[1],
                    raw: match[0],
                });
            }
            const rolePattern = new RegExp(MENTION_PATTERNS.role.source, 'g');
            while ((match = rolePattern.exec(content)) !== null) {
                mentions.push({
                    type: 'role',
                    id: match[1],
                    raw: match[0],
                });
            }
            const channelPattern = new RegExp(MENTION_PATTERNS.channel.source, 'g');
            while ((match = channelPattern.exec(content)) !== null) {
                mentions.push({
                    type: 'channel',
                    id: match[1],
                    raw: match[0],
                });
            }
            const everyonePattern = new RegExp(MENTION_PATTERNS.everyone.source, 'g');
            while ((match = everyonePattern.exec(content)) !== null) {
                mentions.push({
                    type: 'everyone',
                    raw: match[0],
                });
            }
            const herePattern = new RegExp(MENTION_PATTERNS.here.source, 'g');
            while ((match = herePattern.exec(content)) !== null) {
                mentions.push({
                    type: 'here',
                    raw: match[0],
                });
            }
            return mentions;
        }
        catch (error) {
            logger.error({ error, contentLength: content.length }, 'Error parsing mentions');
            return [];
        }
    }
    async validateMentions(mentions, channelId, serverId) {
        const result = {
            valid: true,
            invalidMentions: [],
            errors: [],
        };
        try {
            const userIds = mentions.filter(m => m.type === 'user' && m.id).map(m => m.id);
            const roleIds = mentions.filter(m => m.type === 'role' && m.id).map(m => m.id);
            const channelIds = mentions.filter(m => m.type === 'channel' && m.id).map(m => m.id);
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
                if (serverId && channelId) {
                    const serverMemberIds = await db('server_members')
                        .where('server_id', serverId)
                        .whereIn('user_id', userIds)
                        .pluck('user_id');
                    const nonMemberIds = userIds.filter(id => existingUsers.includes(id) && !serverMemberIds.includes(id));
                    for (const id of nonMemberIds) {
                        result.errors.push(`User ${id} is not a member of this server`);
                    }
                }
            }
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
            }
            else if (roleIds.length > 0 && !serverId) {
                for (const mention of mentions.filter(m => m.type === 'role')) {
                    result.invalidMentions.push(mention);
                    result.errors.push('Role mentions are not allowed in DMs');
                }
            }
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
            }
            else if (channelIds.length > 0 && !serverId) {
                logger.debug({ channelIds }, 'Channel mentions in DM context');
            }
            result.valid = result.invalidMentions.length === 0;
            return result;
        }
        catch (error) {
            logger.error({ error }, 'Error validating mentions');
            result.valid = false;
            result.errors.push('Failed to validate mentions');
            return result;
        }
    }
    async getMentionedUsers(content, _channelId, serverId) {
        const mentions = this.parseMentions(content);
        const userIds = new Set();
        try {
            for (const mention of mentions) {
                if (mention.type === 'user' && mention.id) {
                    userIds.add(mention.id);
                }
            }
            const hasEveryone = mentions.some(m => m.type === 'everyone');
            const hasHere = mentions.some(m => m.type === 'here');
            if ((hasEveryone || hasHere) && serverId) {
                let query = db('server_members')
                    .where('server_id', serverId);
                if (hasHere && !hasEveryone) {
                    query = query.whereNotNull('user_id');
                }
                const memberUserIds = await query.pluck('user_id');
                for (const id of memberUserIds) {
                    userIds.add(id);
                }
            }
            return Array.from(userIds);
        }
        catch (error) {
            logger.error({ error }, 'Error getting mentioned users');
            return Array.from(userIds);
        }
    }
    async replaceMentionsWithNames(content, serverId) {
        const mentions = this.parseMentions(content);
        let result = content;
        try {
            const userMentions = mentions.filter(m => m.type === 'user' && m.id);
            if (userMentions.length > 0) {
                const userIds = userMentions.map(m => m.id);
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
            const roleMentions = mentions.filter(m => m.type === 'role' && m.id);
            if (roleMentions.length > 0 && serverId) {
                const roleIds = roleMentions.map(m => m.id);
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
            const channelMentions = mentions.filter(m => m.type === 'channel' && m.id);
            if (channelMentions.length > 0 && serverId) {
                const channelIds = channelMentions.map(m => m.id);
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
            return result;
        }
        catch (error) {
            logger.error({ error }, 'Error replacing mentions with names');
            return content;
        }
    }
    suppressMentions(content) {
        let result = content;
        result = result.replace(/<@(\d{20})>/g, '\\<@$1\\>');
        result = result.replace(/<@&(\d{20})>/g, '\\<@&$1\\>');
        result = result.replace(/<#(\d{20})>/g, '\\<#$1\\>');
        result = result.replace(/@everyone/g, '@\u200Beveryone');
        result = result.replace(/@here/g, '@\u200Bhere');
        return result;
    }
    shouldNotifyUser(content, userId) {
        const mentions = this.parseMentions(content);
        if (mentions.some(m => m.type === 'user' && m.id === userId)) {
            return true;
        }
        return false;
    }
    countMentions(content) {
        const mentions = this.parseMentions(content);
        const counts = {
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
export const mentionService = new MentionService();
//# sourceMappingURL=mention.service.js.map