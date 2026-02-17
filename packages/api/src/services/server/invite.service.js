import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION, DEFAULTS } from '@freedomtalk/shared';
class InviteService {
    generateCode(length = VALIDATION.INVITE.CODE_LENGTH) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    async createInvite(input) {
        const server = await db('servers').where('id', input.serverId).first();
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        const channel = await db('channels')
            .where('id', input.channelId)
            .where('server_id', input.serverId)
            .first();
        if (!channel) {
            throw new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel not found in this server');
        }
        if (input.maxUses !== undefined && input.maxUses !== null) {
            if (input.maxUses < 0 || input.maxUses > VALIDATION.INVITE.MAX_USES) {
                throw new AppError(400, 'INVALID_MAX_USES', `Max uses must be between 0 and ${VALIDATION.INVITE.MAX_USES}`);
            }
        }
        if (input.maxAge !== undefined && input.maxAge !== null) {
            if (input.maxAge < 0 || input.maxAge > VALIDATION.INVITE.MAX_AGE) {
                throw new AppError(400, 'INVALID_MAX_AGE', `Max age must be between 0 and ${VALIDATION.INVITE.MAX_AGE} seconds`);
            }
        }
        let code = this.generateCode();
        let attempts = 0;
        while (await this.codeExists(code)) {
            code = this.generateCode();
            attempts++;
            if (attempts > 10) {
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
        return this.getInviteByCode(code);
    }
    async getInviteByCode(code) {
        const invite = await db('invites')
            .where('code', code)
            .first();
        if (!invite)
            return null;
        const [server, channel, inviter] = await Promise.all([
            db('servers').where('id', invite.server_id).first(),
            db('channels').where('id', invite.channel_id).first(),
            db('users').where('id', invite.inviter_id).select('id', 'username', 'avatar').first(),
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
    async getInvite(inviteId) {
        const invite = await db('invites')
            .where('id', inviteId)
            .first();
        if (!invite)
            return null;
        return this.getInviteByCode(invite.code);
    }
    async getServerInvites(serverId) {
        const invites = await db('invites')
            .where('server_id', serverId)
            .orderBy('created_at', 'desc');
        const channelIds = [...new Set(invites.map(i => i.channel_id))];
        const inviterIds = [...new Set(invites.map(i => i.inviter_id))];
        const [channels, inviters] = await Promise.all([
            db('channels').whereIn('id', channelIds).select('id', 'name', 'type'),
            db('users').whereIn('id', inviterIds).select('id', 'username', 'avatar'),
        ]);
        const channelMap = new Map(channels.map(c => [c.id, c]));
        const inviterMap = new Map(inviters.map(u => [u.id, u]));
        const server = await db('servers').where('id', serverId).first();
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
                name: channelMap.get(invite.channel_id).name,
                type: channelMap.get(invite.channel_id).type,
            } : undefined,
            inviter: inviterMap.get(invite.inviter_id) ? {
                id: invite.inviter_id,
                username: inviterMap.get(invite.inviter_id).username,
                avatar: inviterMap.get(invite.inviter_id).avatar,
            } : undefined,
        }));
    }
    async getChannelInvites(channelId) {
        const invites = await db('invites')
            .where('channel_id', channelId)
            .orderBy('created_at', 'desc');
        const results = [];
        for (const invite of invites) {
            const full = await this.getInviteByCode(invite.code);
            if (full)
                results.push(full);
        }
        return results;
    }
    async deleteInvite(code, userId) {
        const invite = await db('invites').where('code', code).first();
        if (!invite) {
            throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
        }
        const server = await db('servers').where('id', invite.server_id).first();
        if (invite.inviter_id !== userId && server?.owner_id !== userId) {
            throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this invite');
        }
        await db('invites').where('code', code).delete();
    }
    async useInvite(code, _userId) {
        const invite = await this.getInviteByCode(code);
        if (!invite) {
            throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite not found');
        }
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            throw new AppError(400, 'INVITE_EXPIRED', 'This invite has expired');
        }
        if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
            throw new AppError(400, 'INVITE_MAX_USES', 'This invite has reached its maximum uses');
        }
        await db('invites')
            .where('code', code)
            .increment('uses', 1);
        return invite;
    }
    async codeExists(code) {
        const invite = await db('invites')
            .where('code', code)
            .first();
        return !!invite;
    }
    async cleanupExpiredInvites() {
        const deleted = await db('invites')
            .where('expires_at', '<', new Date())
            .delete();
        return deleted;
    }
}
export const inviteService = new InviteService();
//# sourceMappingURL=invite.service.js.map