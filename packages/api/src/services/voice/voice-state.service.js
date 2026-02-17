import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
class VoiceStateService {
    MAX_USERS_PER_CHANNEL = 25;
    async createVoiceState(input) {
        const existingState = await this.getUserVoiceStateInServer(input.serverId, input.userId);
        if (existingState) {
            const [updated] = await db('voice_states')
                .where({ id: existingState.id })
                .update({
                channel_id: input.channelId,
                session_id: input.sessionId,
                self_mute: input.selfMute ?? false,
                self_deaf: input.selfDeaf ?? false,
                self_video: input.selfVideo ?? false,
                self_stream: false,
                suppress: false,
                joined_at: new Date(),
            })
                .returning('*');
            return updated;
        }
        const channelCount = await this.getChannelUserCount(input.channelId);
        if (channelCount >= this.MAX_USERS_PER_CHANNEL) {
            throw new AppError(400, 'CHANNEL_FULL', 'Voice channel is full');
        }
        const stateId = generateSnowflakeId();
        const [state] = await db('voice_states')
            .insert({
            id: stateId,
            channel_id: input.channelId,
            user_id: input.userId,
            server_id: input.serverId,
            session_id: input.sessionId,
            self_mute: input.selfMute ?? false,
            self_deaf: input.selfDeaf ?? false,
            self_video: input.selfVideo ?? false,
            self_stream: false,
            suppress: false,
        })
            .returning('*');
        return state;
    }
    async deleteVoiceState(sessionId) {
        await db('voice_states')
            .where({ session_id: sessionId })
            .delete();
    }
    async deleteVoiceStateByUserChannel(channelId, userId) {
        await db('voice_states')
            .where({ channel_id: channelId, user_id: userId })
            .delete();
    }
    async updateVoiceState(sessionId, input) {
        const existing = await this.getVoiceStateBySession(sessionId);
        if (!existing) {
            throw new AppError(404, 'VOICE_STATE_NOT_FOUND', 'Voice state not found');
        }
        const updateData = {};
        if (input.selfMute !== undefined)
            updateData.self_mute = input.selfMute;
        if (input.selfDeaf !== undefined)
            updateData.self_deaf = input.selfDeaf;
        if (input.selfVideo !== undefined)
            updateData.self_video = input.selfVideo;
        if (input.selfStream !== undefined)
            updateData.self_stream = input.selfStream;
        if (input.suppress !== undefined)
            updateData.suppress = input.suppress;
        if (Object.keys(updateData).length === 0) {
            return existing;
        }
        const [updated] = await db('voice_states')
            .where({ session_id: sessionId })
            .update(updateData)
            .returning('*');
        return updated;
    }
    async getVoiceStateBySession(sessionId) {
        const state = await db('voice_states')
            .where({ session_id: sessionId })
            .first();
        return state || null;
    }
    async getVoiceStateByUserId(userId) {
        const state = await db('voice_states')
            .where({ user_id: userId })
            .first();
        return state || null;
    }
    async getUserVoiceStateInServer(serverId, userId) {
        const state = await db('voice_states')
            .where({ server_id: serverId, user_id: userId })
            .first();
        return state || null;
    }
    async getChannelVoiceStates(channelId) {
        const states = await db('voice_states')
            .where({ channel_id: channelId })
            .orderBy('joined_at', 'asc');
        const userIds = states.map(s => s.user_id);
        const users = await db('users')
            .whereIn('id', userIds)
            .select('id', 'username', 'avatar');
        const userMap = new Map(users.map(u => [u.id, u]));
        return states.map(state => ({
            ...state,
            user: userMap.get(state.user_id) ? {
                id: state.user_id,
                username: userMap.get(state.user_id).username,
                avatar: userMap.get(state.user_id).avatar,
            } : undefined,
        }));
    }
    async getServerVoiceStates(serverId) {
        return db('voice_states')
            .where({ server_id: serverId })
            .orderBy('joined_at', 'asc');
    }
    async getChannelUserCount(channelId) {
        const result = await db('voice_states')
            .where({ channel_id: channelId })
            .count('id as count')
            .first();
        return parseInt(String(result?.count || 0), 10);
    }
    async moveUser(sessionId, targetChannelId) {
        const existing = await this.getVoiceStateBySession(sessionId);
        if (!existing) {
            throw new AppError(404, 'VOICE_STATE_NOT_FOUND', 'Voice state not found');
        }
        const channelCount = await this.getChannelUserCount(targetChannelId);
        if (channelCount >= this.MAX_USERS_PER_CHANNEL) {
            throw new AppError(400, 'CHANNEL_FULL', 'Target voice channel is full');
        }
        const [updated] = await db('voice_states')
            .where({ session_id: sessionId })
            .update({
            channel_id: targetChannelId,
            joined_at: new Date(),
        })
            .returning('*');
        return updated;
    }
    async suppressUser(sessionId, suppress) {
        const existing = await this.getVoiceStateBySession(sessionId);
        if (!existing) {
            throw new AppError(404, 'VOICE_STATE_NOT_FOUND', 'Voice state not found');
        }
        const [updated] = await db('voice_states')
            .where({ session_id: sessionId })
            .update({ suppress })
            .returning('*');
        return updated;
    }
    async kickUser(sessionId) {
        await this.deleteVoiceState(sessionId);
    }
    async getChannelStreams(channelId) {
        const states = await db('voice_states')
            .where({ channel_id: channelId });
        return {
            video: states.filter(s => s.self_video).length,
            screen: states.filter(s => s.self_stream).length,
        };
    }
}
export const voiceStateService = new VoiceStateService();
//# sourceMappingURL=voice-state.service.js.map