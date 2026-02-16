/**
 * DM Channel Service
 * Handles all DM channel-related business logic
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { NotFoundError, ConflictError, AuthorizationError, ApiError, ApiErrorCode } from '../../types/api.types';
import { logger } from '../../config/logger';
import { DMChannel, DMChannelType } from './dm-channel.types';

/**
 * DM Channel participant interface
 */
export interface DMChannelParticipant {
  id: string;
  dm_channel_id: string;
  user_id: string;
  joined_at: Date;
  left_at: Date | null;
  is_active: boolean;
}

/**
 * DM Channel with participants
 */
export interface DMChannelWithParticipants extends DMChannel {
  participants: DMChannelParticipant[];
}

/**
 * Create DM request
 */
export interface CreateDMRequest {
  recipientId: string;
}

/**
 * Create Group DM request
 */
export interface CreateGroupDMRequest {
  participantIds: string[];
  name?: string;
  iconUrl?: string;
}

/**
 * Update Group DM request
 */
export interface UpdateGroupDMRequest {
  name?: string;
  iconUrl?: string;
}

/**
 * DM Channel Service class
 */
class DMChannelService {
  /**
   * Create a DM between two users
   * If a DM already exists between these users, return the existing one
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns DM channel with participants
   */
  async createDM(userId1: string, userId2: string): Promise<DMChannelWithParticipants> {
    try {
      // Check if DM already exists between these users
      const existingDM = await this.getDMByParticipants(userId1, userId2);
      if (existingDM) {
        logger.debug({ dmChannelId: existingDM.id, userId1, userId2 }, 'Returning existing DM');
        return existingDM;
      }

      // Verify both users exist
      const users = await db('users')
        .whereIn('id', [userId1, userId2])
        .select('id');

      if (users.length !== 2) {
        throw new NotFoundError('One or both users not found');
      }

      const dmChannelId = generateSnowflakeId();
      const now = new Date();

      // Create DM channel and participants in a transaction
      const result = await db.transaction(async (trx) => {
        // Create DM channel
        await trx('dm_channels').insert({
          id: dmChannelId,
          type: 'dm' as DMChannelType,
          name: null,
          icon_url: null,
          owner_id: null,
          created_at: now,
          updated_at: now,
        });

        // Add both users as participants
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

      // Fetch and return the created DM with participants
      const dmChannel = await this.getDMById(result);
      return dmChannel;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, userId1, userId2 }, 'Error creating DM');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create DM', 500);
    }
  }

  /**
   * Create a group DM with multiple participants
   *
   * @param ownerId - User ID of the group owner
   * @param participantIds - Array of participant user IDs (3-10 total including owner)
   * @param name - Optional group name
   * @param iconUrl - Optional group icon URL
   * @returns Group DM channel with participants
   */
  async createGroupDM(
    ownerId: string,
    participantIds: string[],
    name?: string,
    iconUrl?: string
  ): Promise<DMChannelWithParticipants> {
    try {
      // Validate participant count (min 3, max 10 including owner)
      const allParticipantIds = [...new Set([ownerId, ...participantIds])];
      if (allParticipantIds.length < 2) {
        throw new ConflictError('Group DM requires at least 2 participants');
      }
      if (allParticipantIds.length > 10) {
        throw new ConflictError('Group DM cannot have more than 10 participants');
      }

      // Validate name length if provided
      if (name && (name.length < 1 || name.length > 100)) {
        throw new ConflictError('Group DM name must be between 1 and 100 characters');
      }

      // Verify all users exist
      const users = await db('users')
        .whereIn('id', allParticipantIds)
        .select('id');

      if (users.length !== allParticipantIds.length) {
        throw new NotFoundError('One or more users not found');
      }

      const dmChannelId = generateSnowflakeId();
      const now = new Date();

      // Create group DM and participants in a transaction
      await db.transaction(async (trx) => {
        // Create group DM channel
        await trx('dm_channels').insert({
          id: dmChannelId,
          type: 'group_dm' as DMChannelType,
          name: name || null,
          icon_url: iconUrl || null,
          owner_id: ownerId,
          created_at: now,
          updated_at: now,
        });

        // Add all users as participants
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

      // Fetch and return the created group DM with participants
      const dmChannel = await this.getDMById(dmChannelId);
      return dmChannel;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error, ownerId, participantIds }, 'Error creating group DM');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to create group DM', 500);
    }
  }

  /**
   * Get DM channel by ID
   *
   * @param dmChannelId - DM channel ID
   * @returns DM channel with participants
   * @throws NotFoundError if DM channel doesn't exist
   */
  async getDMById(dmChannelId: string): Promise<DMChannelWithParticipants> {
    try {
      const dmChannel = await db('dm_channels')
        .where({ id: dmChannelId })
        .first();

      if (!dmChannel) {
        throw new NotFoundError('DM channel');
      }

      // Get active participants
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
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, dmChannelId }, 'Error fetching DM channel');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch DM channel', 500);
    }
  }

  /**
   * Get existing DM between two users
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns DM channel with participants or null
   */
  async getDMByParticipants(userId1: string, userId2: string): Promise<DMChannelWithParticipants | null> {
    try {
      // Find DM channel where both users are active participants and channel type is 'dm'
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

      // Get active participants
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
    } catch (error) {
      logger.error({ error, userId1, userId2 }, 'Error finding DM by participants');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to find DM', 500);
    }
  }

  /**
   * Get all DMs for a user (paginated)
   *
   * @param userId - User ID
   * @param limit - Number of DMs to fetch
   * @param offset - Offset for pagination
   * @returns Array of DM channels with participants and last message preview
   */
  async getDMsByUser(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ dmChannels: DMChannelWithParticipants[]; total: number }> {
    try {
      // Get DM channels where user is an active participant
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

      // Get total count
      const countResult = await db('dm_channels as dc')
        .join('dm_channel_participants as p', 'dc.id', 'p.dm_channel_id')
        .where('p.user_id', userId)
        .where('p.is_active', true)
        .countDistinct('dc.id as count')
        .first();

      const total = parseInt(String(countResult?.count || '0'), 10);

      // Get participants for each DM
      const dmChannelsWithParticipants = await Promise.all(
        dmChannels.map(async (dmChannel) => {
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
        })
      );

      return {
        dmChannels: dmChannelsWithParticipants,
        total,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error fetching DMs for user');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to fetch DMs', 500);
    }
  }

  /**
   * Add a participant to a group DM
   *
   * @param dmChannelId - DM channel ID
   * @param userId - User ID to add
   * @param requesterId - User ID of the requester
   * @returns Updated DM channel with participants
   * @throws NotFoundError if DM channel or user doesn't exist
   * @throws AuthorizationError if requester doesn't have permission
   * @throws ConflictError if max participants exceeded
   */
  async addParticipant(
    dmChannelId: string,
    userId: string,
    requesterId: string
  ): Promise<DMChannelWithParticipants> {
    try {
      const dmChannel = await this.getDMById(dmChannelId);

      // Verify it's a group DM
      if (dmChannel.type !== 'group_dm') {
        throw new ConflictError('Cannot add participants to a non-group DM');
      }

      // Verify requester is owner or participant
      const requesterParticipant = dmChannel.participants.find((p) => p.user_id === requesterId);
      if (!requesterParticipant) {
        throw new AuthorizationError('Only participants can add new members');
      }

      // Check if user is already a participant
      const existingParticipant = dmChannel.participants.find((p) => p.user_id === userId);
      if (existingParticipant) {
        throw new ConflictError('User is already a participant');
      }

      // Check max participants
      if (dmChannel.participants.length >= 10) {
        throw new ConflictError('Group DM cannot have more than 10 participants');
      }

      // Verify user exists
      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        throw new NotFoundError('User');
      }

      const now = new Date();

      // Add participant
      await db('dm_channel_participants').insert({
        id: generateSnowflakeId(),
        dm_channel_id: dmChannelId,
        user_id: userId,
        joined_at: now,
        left_at: null,
        is_active: true,
      });

      // Update DM channel's updated_at
      await db('dm_channels')
        .where({ id: dmChannelId })
        .update({ updated_at: now });

      logger.info({ dmChannelId, userId, requesterId }, 'Participant added to group DM');

      return this.getDMById(dmChannelId);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error, dmChannelId, userId, requesterId }, 'Error adding participant');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to add participant', 500);
    }
  }

  /**
   * Remove a participant from a group DM
   *
   * @param dmChannelId - DM channel ID
   * @param userId - User ID to remove
   * @param requesterId - User ID of the requester
   * @returns Updated DM channel with participants
   * @throws NotFoundError if DM channel doesn't exist
   * @throws AuthorizationError if requester doesn't have permission
   */
  async removeParticipant(
    dmChannelId: string,
    userId: string,
    requesterId: string
  ): Promise<DMChannelWithParticipants> {
    try {
      const dmChannel = await this.getDMById(dmChannelId);

      // Verify it's a group DM
      if (dmChannel.type !== 'group_dm') {
        throw new ConflictError('Cannot remove participants from a non-group DM');
      }

      // Verify requester is owner or removing themselves
      const isOwner = dmChannel.owner_id === requesterId;
      const isSelf = userId === requesterId;

      if (!isOwner && !isSelf) {
        throw new AuthorizationError('Only the owner can remove other participants');
      }

      // Check if user is a participant
      const participant = dmChannel.participants.find((p) => p.user_id === userId);
      if (!participant) {
        throw new NotFoundError('Participant');
      }

      const now = new Date();

      // Mark participant as inactive (soft delete)
      await db('dm_channel_participants')
        .where({ id: participant.id })
        .update({
          is_active: false,
          left_at: now,
        });

      // Update DM channel's updated_at
      await db('dm_channels')
        .where({ id: dmChannelId })
        .update({ updated_at: now });

      // If owner is leaving and there are other participants, transfer ownership
      if (isOwner && isSelf && dmChannel.participants.length > 1) {
        const remainingParticipants = dmChannel.participants.filter(
          (p) => p.user_id !== userId && p.is_active
        );
        const newOwner = remainingParticipants[0];
        if (newOwner) {
          // Transfer ownership to the first remaining participant
          await db('dm_channels')
            .where({ id: dmChannelId })
            .update({ owner_id: newOwner.user_id });

          logger.info({ dmChannelId, newOwnerId: newOwner.user_id }, 'DM ownership transferred');
        }
      }

      logger.info({ dmChannelId, userId, requesterId }, 'Participant removed from group DM');

      return this.getDMById(dmChannelId);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error, dmChannelId, userId, requesterId }, 'Error removing participant');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to remove participant', 500);
    }
  }

  /**
   * Update a group DM's name or icon
   *
   * @param dmChannelId - DM channel ID
   * @param updates - Updates to apply
   * @param requesterId - User ID of the requester
   * @returns Updated DM channel with participants
   * @throws NotFoundError if DM channel doesn't exist
   * @throws AuthorizationError if requester is not the owner
   */
  async updateGroupDM(
    dmChannelId: string,
    updates: UpdateGroupDMRequest,
    requesterId: string
  ): Promise<DMChannelWithParticipants> {
    try {
      const dmChannel = await this.getDMById(dmChannelId);

      // Verify it's a group DM
      if (dmChannel.type !== 'group_dm') {
        throw new ConflictError('Cannot update a non-group DM');
      }

      // Verify requester is owner
      if (dmChannel.owner_id !== requesterId) {
        throw new AuthorizationError('Only the owner can update the group DM');
      }

      // Validate name if provided
      if (updates.name !== undefined) {
        if (updates.name && (updates.name.length < 1 || updates.name.length > 100)) {
          throw new ConflictError('Group DM name must be between 1 and 100 characters');
        }
      }

      const now = new Date();

      // Update DM channel
      await db('dm_channels')
        .where({ id: dmChannelId })
        .update({
          name: updates.name !== undefined ? updates.name : dmChannel.name,
          icon_url: updates.iconUrl !== undefined ? updates.iconUrl : dmChannel.icon_url,
          updated_at: now,
        });

      logger.info({ dmChannelId, requesterId, updates }, 'Group DM updated');

      return this.getDMById(dmChannelId);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ConflictError) {
        throw error;
      }
      logger.error({ error, dmChannelId, requesterId }, 'Error updating group DM');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to update group DM', 500);
    }
  }

  /**
   * Soft delete a DM for a user (leave/close DM)
   *
   * @param dmChannelId - DM channel ID
   * @param userId - User ID
   * @throws NotFoundError if DM channel doesn't exist
   */
  async deleteDM(dmChannelId: string, userId: string): Promise<void> {
    try {
      const dmChannel = await this.getDMById(dmChannelId);

      // Find user's participant record
      const participant = dmChannel.participants.find((p) => p.user_id === userId);
      if (!participant) {
        throw new NotFoundError('Participant');
      }

      const now = new Date();

      // Mark participant as inactive
      await db('dm_channel_participants')
        .where({ id: participant.id })
        .update({
          is_active: false,
          left_at: now,
        });

      // For group DMs, transfer ownership if owner is leaving
      if (dmChannel.type === 'group_dm' && dmChannel.owner_id === userId) {
        const remainingParticipants = dmChannel.participants.filter(
          (p) => p.user_id !== userId && p.is_active
        );
        const newOwner = remainingParticipants[0];
        if (newOwner) {
          await db('dm_channels')
            .where({ id: dmChannelId })
            .update({ owner_id: newOwner.user_id });
        }
      }

      logger.info({ dmChannelId, userId }, 'User left DM');
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error({ error, dmChannelId, userId }, 'Error deleting DM');
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Failed to delete DM', 500);
    }
  }

  /**
   * Check if a user is a participant in a DM channel
   *
   * @param dmChannelId - DM channel ID
   * @param userId - User ID
   * @returns True if user is an active participant
   */
  async isParticipant(dmChannelId: string, userId: string): Promise<boolean> {
    try {
      const participant = await db('dm_channel_participants')
        .where({
          dm_channel_id: dmChannelId,
          user_id: userId,
          is_active: true,
        })
        .first();

      return !!participant;
    } catch (error) {
      logger.error({ error, dmChannelId, userId }, 'Error checking participant status');
      return false;
    }
  }

  /**
   * Get participant user IDs for a DM channel
   *
   * @param dmChannelId - DM channel ID
   * @returns Array of active participant user IDs
   */
  async getParticipantUserIds(dmChannelId: string): Promise<string[]> {
    try {
      const participants = await db('dm_channel_participants')
        .where({
          dm_channel_id: dmChannelId,
          is_active: true,
        })
        .pluck('user_id');

      return participants;
    } catch (error) {
      logger.error({ error, dmChannelId }, 'Error getting participant user IDs');
      return [];
    }
  }
}

// Export singleton instance
export const dmChannelService = new DMChannelService();
