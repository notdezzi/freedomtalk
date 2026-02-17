import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { VALIDATION, DEFAULTS } from '@freedomtalk/shared';
class ChannelService {
    async createChannel(input) {
        const server = await db('servers').where('id', input.serverId).first();
        if (!server) {
            throw new AppError(404, 'SERVER_NOT_FOUND', 'Server not found');
        }
        if (input.name.length < VALIDATION.CHANNEL_NAME.MIN_LENGTH ||
            input.name.length > VALIDATION.CHANNEL_NAME.MAX_LENGTH) {
            throw new AppError(400, 'INVALID_NAME', `Channel name must be between ${VALIDATION.CHANNEL_NAME.MIN_LENGTH} and ${VALIDATION.CHANNEL_NAME.MAX_LENGTH} characters`);
        }
        const validTypes = ['text', 'voice', 'announcement'];
        if (!validTypes.includes(input.type)) {
            throw new AppError(400, 'INVALID_TYPE', `Channel type must be one of: ${validTypes.join(', ')}`);
        }
        if (input.categoryId) {
            const category = await db('channel_categories')
                .where('id', input.categoryId)
                .where('server_id', input.serverId)
                .first();
            if (!category) {
                throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found in this server');
            }
        }
        const maxPosition = await db('channels')
            .where('server_id', input.serverId)
            .where('category_id', input.categoryId || null)
            .max('position as max')
            .first();
        const position = input.position ?? ((maxPosition?.max || -1) + 1);
        if (input.type === 'voice') {
            if (input.bitrate !== undefined) {
                if (input.bitrate < VALIDATION.VOICE.MIN_BITRATE || input.bitrate > VALIDATION.VOICE.MAX_BITRATE) {
                    throw new AppError(400, 'INVALID_BITRATE', `Bitrate must be between ${VALIDATION.VOICE.MIN_BITRATE} and ${VALIDATION.VOICE.MAX_BITRATE}`);
                }
            }
            if (input.userLimit !== undefined && (input.userLimit < 0 || input.userLimit > VALIDATION.VOICE.MAX_USER_LIMIT)) {
                throw new AppError(400, 'INVALID_USER_LIMIT', `User limit must be between 0 and ${VALIDATION.VOICE.MAX_USER_LIMIT}`);
            }
        }
        const channelId = generateSnowflakeId();
        const [channel] = await db('channels')
            .insert({
            id: channelId,
            server_id: input.serverId,
            category_id: input.categoryId || null,
            name: input.name,
            type: input.type,
            topic: input.topic || null,
            position,
            nsfw: input.nsfw || false,
            rate_limit_per_user: input.rateLimitPerUser || 0,
            parent_id: null,
            last_message_id: null,
            bitrate: input.type === 'voice' ? (input.bitrate || DEFAULTS.CHANNEL.BITRATE) : null,
            user_limit: input.type === 'voice' ? (input.userLimit || 0) : null,
            rtc_region: input.type === 'voice' ? (input.rtcRegion || null) : null,
        })
            .returning('*');
        return channel;
    }
    async getChannel(channelId) {
        const channel = await db('channels').where('id', channelId).first();
        return channel || null;
    }
    async getServerChannels(serverId) {
        const channels = await db('channels')
            .where('server_id', serverId)
            .orderBy('position', 'asc');
        return channels;
    }
    async getCategoryChannels(categoryId) {
        const channels = await db('channels')
            .where('category_id', categoryId)
            .orderBy('position', 'asc');
        return channels;
    }
    async updateChannel(channelId, input) {
        const channel = await this.getChannel(channelId);
        if (!channel) {
            throw new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel not found');
        }
        const updateData = {
            updated_at: new Date(),
        };
        if (input.name !== undefined) {
            if (input.name.length < VALIDATION.CHANNEL_NAME.MIN_LENGTH ||
                input.name.length > VALIDATION.CHANNEL_NAME.MAX_LENGTH) {
                throw new AppError(400, 'INVALID_NAME', `Channel name must be between ${VALIDATION.CHANNEL_NAME.MIN_LENGTH} and ${VALIDATION.CHANNEL_NAME.MAX_LENGTH} characters`);
            }
            updateData.name = input.name;
        }
        if (input.topic !== undefined) {
            if (input.topic && input.topic.length > VALIDATION.CHANNEL_TOPIC.MAX_LENGTH) {
                throw new AppError(400, 'INVALID_TOPIC', `Topic must be at most ${VALIDATION.CHANNEL_TOPIC.MAX_LENGTH} characters`);
            }
            updateData.topic = input.topic;
        }
        if (input.position !== undefined) {
            updateData.position = input.position;
        }
        if (input.nsfw !== undefined) {
            updateData.nsfw = input.nsfw;
        }
        if (input.rateLimitPerUser !== undefined) {
            updateData.rate_limit_per_user = input.rateLimitPerUser;
        }
        if (input.categoryId !== undefined) {
            updateData.category_id = input.categoryId;
        }
        if (channel.type === 'voice') {
            if (input.bitrate !== undefined) {
                if (input.bitrate < VALIDATION.VOICE.MIN_BITRATE || input.bitrate > VALIDATION.VOICE.MAX_BITRATE) {
                    throw new AppError(400, 'INVALID_BITRATE', `Bitrate must be between ${VALIDATION.VOICE.MIN_BITRATE} and ${VALIDATION.VOICE.MAX_BITRATE}`);
                }
                updateData.bitrate = input.bitrate;
            }
            if (input.userLimit !== undefined) {
                if (input.userLimit < 0 || input.userLimit > VALIDATION.VOICE.MAX_USER_LIMIT) {
                    throw new AppError(400, 'INVALID_USER_LIMIT', `User limit must be between 0 and ${VALIDATION.VOICE.MAX_USER_LIMIT}`);
                }
                updateData.user_limit = input.userLimit;
            }
            if (input.rtcRegion !== undefined) {
                updateData.rtc_region = input.rtcRegion;
            }
        }
        const [updated] = await db('channels')
            .where('id', channelId)
            .update(updateData)
            .returning('*');
        return updated;
    }
    async deleteChannel(channelId) {
        const channel = await this.getChannel(channelId);
        if (!channel) {
            throw new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel not found');
        }
        await db('channels').where('id', channelId).delete();
    }
    async updateChannelPositions(serverId, positions) {
        await db.transaction(async (trx) => {
            for (const { id, position, categoryId } of positions) {
                const updateData = {
                    position,
                    updated_at: new Date(),
                };
                if (categoryId !== undefined) {
                    updateData.category_id = categoryId;
                }
                await trx('channels')
                    .where('id', id)
                    .where('server_id', serverId)
                    .update(updateData);
            }
        });
        return this.getServerChannels(serverId);
    }
    async updateLastMessage(channelId, messageId) {
        await db('channels')
            .where('id', channelId)
            .update({
            last_message_id: messageId,
            updated_at: new Date(),
        });
    }
    async getChannelWithOverwrites(channelId) {
        const channel = await this.getChannel(channelId);
        if (!channel)
            return null;
        const overwrites = await db('permission_overwrites')
            .where('channel_id', channelId);
        return { channel, overwrites };
    }
}
export const channelService = new ChannelService();
//# sourceMappingURL=channel.service.js.map