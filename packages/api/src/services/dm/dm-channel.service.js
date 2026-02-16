import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, AuthorizationError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
class DMChannelService {
    async createDM(userId1, userId2) {
        try {
            const existingDM = await this.getDMByParticipants(userId1, userId2);
            if (existingDM) {
                logger.debug({ dmChannelId: existingDM.id, userId1, userId2 }, 'Returning existing DM');
                return existingDM;
            }
            const users = await db('users')
                .whereIn('id', [userId1, userId2])
                .select('id');
            if (users.length !== 2) {
                throw new NotFoundError('One or both users not found');
            }
            const dmChannelId = generateSnowflakeId();
            const now = new Date();
            const result = await db.transaction(async (trx) => {
                await trx('dm_channels').insert({
                    id: dmChannelId,
                    type: 'dm',
                    name: null,
                    icon_url: null,
                    owner_id: null,
                    created_at: now,
                    updated_at: now,
                });
                const participant1Id = generateSnowflakeId();
                const participant2Id = generateSnowflakeId();
                await trx('dm_channel_participants').insert([
                    {
                        id: participant1Id,
                        dm_channel_id: dmChannelId,
                        user_id: userId1,
                        joined_at: now,
                        left_at: null,
                        is_active: true,
                    },
                    {
                        id: participant2Id,
                        dm_channel_id: dmChannelId,
                        user_id: userId2,
                        joined_at: now,
                        left_at: null,
                        is_active: true,
                    },
                ]);
                return dmChannelId;
            });
            logger.info({ dmChannelId: result, userId1, userId2 }, 'DM channel created');
            const dmChannel = await this.getDMById(result);
            return dmChannel;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, userId1, userId2 }, 'Error creating DM');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create DM', 500);
        }
    }
    async createGroupDM(ownerId, participantIds, name, iconUrl) {
        try {
            const allParticipantIds = [...new Set([ownerId, ...participantIds])];
            if (allParticipantIds.length < 2) {
                throw new ConflictError('Group DM requires at least 2 participants');
            }
            if (allParticipantIds.length > 10) {
                throw new ConflictError('Group DM cannot have more than 10 participants');
            }
            if (name && (name.length < 1 || name.length > 100)) {
                throw new ConflictError('Group DM name must be between 1 and 100 characters');
            }
            const users = await db('users')
                .whereIn('id', allParticipantIds)
                .select('id');
            if (users.length !== allParticipantIds.length) {
                throw new NotFoundError('One or more users not found');
            }
            const dmChannelId = generateSnowflakeId();
            const now = new Date();
            await db.transaction(async (trx) => {
                await trx('dm_channels').insert({
                    id: dmChannelId,
                    type: 'group_dm',
                    name: name || null,
                    icon_url: iconUrl || null,
                    owner_id: ownerId,
                    created_at: now,
                    updated_at: now,
                });
                const participantRecords = allParticipantIds.map((userId) => ({
                    id: generateSnowflakeId(),
                    dm_channel_id: dmChannelId,
                    user_id: userId,
                    joined_at: now,
                    left_at: null,
                    is_active: true,
                }));
                await trx('dm_channel_participants').insert(participantRecords);
            });
            logger.info({ dmChannelId, ownerId, participantCount: allParticipantIds.length }, 'Group DM created');
            const dmChannel = await this.getDMById(dmChannelId);
            return dmChannel;
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }
            logger.error({ error, ownerId, participantIds }, 'Error creating group DM');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create group DM', 500);
        }
    }
    async getDMById(dmChannelId) {
        try {
            const dmChannel = await db('dm_channels')
                .where({ id: dmChannelId })
                .first();
            if (!dmChannel) {
                throw new NotFoundError('DM channel');
            }
            const participants = await db('dm_channel_participants')
                .where({
                dm_channel_id: dmChannelId,
                is_active: true,
            })
                .orderBy('joined_at', 'asc');
            return {
                ...dmChannel,
                participants,
            };
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, dmChannelId }, 'Error fetching DM channel');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch DM channel', 500);
        }
    }
    async getDMByParticipants(userId1, userId2) {
        try {
            const dmChannel = await db('dm_channels as dc')
                .join('dm_channel_participants as p1', 'dc.id', 'p1.dm_channel_id')
                .join('dm_channel_participants as p2', 'dc.id', 'p2.dm_channel_id')
                .where('dc.type', 'dm')
                .where('p1.user_id', userId1)
                .where('p1.is_active', true)
                .where('p2.user_id', userId2)
                .where('p2.is_active', true)
                .select('dc.*')
                .first();
            if (!dmChannel) {
                return null;
            }
            const participants = await db('dm_channel_participants')
                .where({
                dm_channel_id: dmChannel.id,
                is_active: true,
            })
                .orderBy('joined_at', 'asc');
            return {
                ...dmChannel,
                participants,
            };
        }
        catch (error) {
            logger.error({ error, userId1, userId2 }, 'Error finding DM by participants');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to find DM', 500);
        }
    }
    async getDMsByUser(userId, limit = 50, offset = 0) {
        try {
            const query = db('dm_channels as dc')
                .join('dm_channel_participants as p', 'dc.id', 'p.dm_channel_id')
                .where('p.user_id', userId)
                .where('p.is_active', true)
                .select('dc.*')
                .distinct()
                .orderBy('dc.updated_at', 'desc')
                .limit(limit)
                .offset(offset);
            const dmChannels = await query;
            const countResult = await db('dm_channels as dc')
                .join('dm_channel_participants as p', 'dc.id', 'p.dm_channel_id')
                .where('p.user_id', userId)
                .where('p.is_active', true)
                .countDistinct('dc.id as count')
                .first();
            const total = parseInt(String(countResult?.count || '0'), 10);
            const dmChannelsWithParticipants = await Promise.all(dmChannels.map(async (dmChannel) => {
                const participants = await db('dm_channel_participants')
                    .where({
                    dm_channel_id: dmChannel.id,
                    is_active: true,
                })
                    .orderBy('joined_at', 'asc');
                return {
                    ...dmChannel,
                    participants,
                };
            }));
            return {
                dmChannels: dmChannelsWithParticipants,
                total,
            };
        }
        catch (error) {
            logger.error({ error, userId }, 'Error fetching DMs for user');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch DMs', 500);
        }
    }
    async addParticipant(dmChannelId, userId, requesterId) {
        try {
            const dmChannel = await this.getDMById(dmChannelId);
            if (dmChannel.type !== 'group_dm') {
                throw new ConflictError('Cannot add participants to a non-group DM');
            }
            const requesterParticipant = dmChannel.participants.find((p) => p.user_id === requesterId);
            if (!requesterParticipant) {
                throw new AuthorizationError('Only participants can add new members');
            }
            const existingParticipant = dmChannel.participants.find((p) => p.user_id === userId);
            if (existingParticipant) {
                throw new ConflictError('User is already a participant');
            }
            if (dmChannel.participants.length >= 10) {
                throw new ConflictError('Group DM cannot have more than 10 participants');
            }
            const user = await db('users').where({ id: userId }).first();
            if (!user) {
                throw new NotFoundError('User');
            }
            const now = new Date();
            await db('dm_channel_participants').insert({
                id: generateSnowflakeId(),
                dm_channel_id: dmChannelId,
                user_id: userId,
                joined_at: now,
                left_at: null,
                is_active: true,
            });
            await db('dm_channels')
                .where({ id: dmChannelId })
                .update({ updated_at: now });
            logger.info({ dmChannelId, userId, requesterId }, 'Participant added to group DM');
            return this.getDMById(dmChannelId);
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ConflictError) {
                throw error;
            }
            logger.error({ error, dmChannelId, userId, requesterId }, 'Error adding participant');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to add participant', 500);
        }
    }
    async removeParticipant(dmChannelId, userId, requesterId) {
        try {
            const dmChannel = await this.getDMById(dmChannelId);
            if (dmChannel.type !== 'group_dm') {
                throw new ConflictError('Cannot remove participants from a non-group DM');
            }
            const isOwner = dmChannel.owner_id === requesterId;
            const isSelf = userId === requesterId;
            if (!isOwner && !isSelf) {
                throw new AuthorizationError('Only the owner can remove other participants');
            }
            const participant = dmChannel.participants.find((p) => p.user_id === userId);
            if (!participant) {
                throw new NotFoundError('Participant');
            }
            const now = new Date();
            await db('dm_channel_participants')
                .where({ id: participant.id })
                .update({
                is_active: false,
                left_at: now,
            });
            await db('dm_channels')
                .where({ id: dmChannelId })
                .update({ updated_at: now });
            if (isOwner && isSelf && dmChannel.participants.length > 1) {
                const remainingParticipants = dmChannel.participants.filter((p) => p.user_id !== userId && p.is_active);
                const newOwner = remainingParticipants[0];
                if (newOwner) {
                    await db('dm_channels')
                        .where({ id: dmChannelId })
                        .update({ owner_id: newOwner.user_id });
                    logger.info({ dmChannelId, newOwnerId: newOwner.user_id }, 'DM ownership transferred');
                }
            }
            logger.info({ dmChannelId, userId, requesterId }, 'Participant removed from group DM');
            return this.getDMById(dmChannelId);
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ConflictError) {
                throw error;
            }
            logger.error({ error, dmChannelId, userId, requesterId }, 'Error removing participant');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove participant', 500);
        }
    }
    async updateGroupDM(dmChannelId, updates, requesterId) {
        try {
            const dmChannel = await this.getDMById(dmChannelId);
            if (dmChannel.type !== 'group_dm') {
                throw new ConflictError('Cannot update a non-group DM');
            }
            if (dmChannel.owner_id !== requesterId) {
                throw new AuthorizationError('Only the owner can update the group DM');
            }
            if (updates.name !== undefined) {
                if (updates.name && (updates.name.length < 1 || updates.name.length > 100)) {
                    throw new ConflictError('Group DM name must be between 1 and 100 characters');
                }
            }
            const now = new Date();
            await db('dm_channels')
                .where({ id: dmChannelId })
                .update({
                name: updates.name !== undefined ? updates.name : dmChannel.name,
                icon_url: updates.iconUrl !== undefined ? updates.iconUrl : dmChannel.icon_url,
                updated_at: now,
            });
            logger.info({ dmChannelId, requesterId, updates }, 'Group DM updated');
            return this.getDMById(dmChannelId);
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ConflictError) {
                throw error;
            }
            logger.error({ error, dmChannelId, requesterId }, 'Error updating group DM');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update group DM', 500);
        }
    }
    async deleteDM(dmChannelId, userId) {
        try {
            const dmChannel = await this.getDMById(dmChannelId);
            const participant = dmChannel.participants.find((p) => p.user_id === userId);
            if (!participant) {
                throw new NotFoundError('Participant');
            }
            const now = new Date();
            await db('dm_channel_participants')
                .where({ id: participant.id })
                .update({
                is_active: false,
                left_at: now,
            });
            if (dmChannel.type === 'group_dm' && dmChannel.owner_id === userId) {
                const remainingParticipants = dmChannel.participants.filter((p) => p.user_id !== userId && p.is_active);
                const newOwner = remainingParticipants[0];
                if (newOwner) {
                    await db('dm_channels')
                        .where({ id: dmChannelId })
                        .update({ owner_id: newOwner.user_id });
                }
            }
            logger.info({ dmChannelId, userId }, 'User left DM');
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, dmChannelId, userId }, 'Error deleting DM');
            throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete DM', 500);
        }
    }
    async isParticipant(dmChannelId, userId) {
        try {
            const participant = await db('dm_channel_participants')
                .where({
                dm_channel_id: dmChannelId,
                user_id: userId,
                is_active: true,
            })
                .first();
            return !!participant;
        }
        catch (error) {
            logger.error({ error, dmChannelId, userId }, 'Error checking participant status');
            return false;
        }
    }
    async getParticipantUserIds(dmChannelId) {
        try {
            const participants = await db('dm_channel_participants')
                .where({
                dm_channel_id: dmChannelId,
                is_active: true,
            })
                .pluck('user_id');
            return participants;
        }
        catch (error) {
            logger.error({ error, dmChannelId }, 'Error getting participant user IDs');
            return [];
        }
    }
}
export const dmChannelService = new DMChannelService();
//# sourceMappingURL=dm-channel.service.js.map