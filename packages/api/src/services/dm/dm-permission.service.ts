/**
 * DM Permission Service
 * Handles DM privacy controls and permission checks
 *
 * DM privacy is separate from the role-based permission system.
 * Users can control who can send them DMs through their dm_privacy_level setting.
 */

import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { DmPrivacyLevel } from '@freedomtalk/shared';

/**
 * Result of checking privacy level for DM permissions
 */
export type PrivacyCheckResult = 'allow' | 'deny';

/**
 * DM Permission Service class
 * Provides methods to check if users can perform DM-related actions
 * based on privacy settings, friend status, and block status.
 */
class DMPermissionService {
  /**
   * Check if sender can send a DM to recipient
   *
   * This checks:
   * 1. If either user has blocked the other
   * 2. Recipient's DM privacy level
   * 3. Friend status if privacy level is 'friends_only'
   *
   * @param senderId - User ID of the sender
   * @param recipientId - User ID of the recipient
   * @returns True if sender can send DM to recipient
   */
  async canSendDM(senderId: string, recipientId: string): Promise<boolean> {
    const result = await this.checkPrivacyLevel(senderId, recipientId);
    return result === 'allow';
  }

  /**
   * Check if sender can add reaction in DM with recipient
   *
   * Reactions in DMs follow the same permission rules as sending messages.
   *
   * @param senderId - User ID of the sender
   * @param recipientId - User ID of the recipient
   * @returns True if sender can add reactions in DM
   */
  async canAddReaction(senderId: string, recipientId: string): Promise<boolean> {
    // Reactions follow the same rules as sending messages
    return this.canSendDM(senderId, recipientId);
  }

  /**
   * Check if sender can attach files in DM with recipient
   *
   * File attachments in DMs follow the same permission rules as sending messages.
   *
   * @param senderId - User ID of the sender
   * @param recipientId - User ID of the recipient
   * @returns True if sender can attach files in DM
   */
  async canAttachFiles(senderId: string, recipientId: string): Promise<boolean> {
    // File attachments follow the same rules as sending messages
    return this.canSendDM(senderId, recipientId);
  }

  /**
   * Raw privacy check - returns allow/deny based on privacy level
   *
   * Logic:
   * 1. If recipient has blocked sender -> deny
   * 2. If sender has blocked recipient -> deny
   * 3. Based on recipient's dm_privacy_level:
   *    - 'none' -> deny
   *    - 'open' -> allow
   *    - 'friends_only' -> check if friends, then allow/deny
   *
   * @param senderId - User ID of the sender
   * @param recipientId - User ID of the recipient
   * @returns 'allow' or 'deny'
   */
  async checkPrivacyLevel(senderId: string, recipientId: string): Promise<PrivacyCheckResult> {
    try {
      // Self-DM is always allowed
      if (senderId === recipientId) {
        return 'allow';
      }

      // Check block status in both directions
      const [recipientBlockedSender, senderBlockedRecipient] = await Promise.all([
        this.isBlocked(recipientId, senderId),
        this.isBlocked(senderId, recipientId),
      ]);

      // If either user has blocked the other, deny
      if (recipientBlockedSender || senderBlockedRecipient) {
        logger.debug(
          { senderId, recipientId, recipientBlockedSender, senderBlockedRecipient },
          'DM blocked due to block relationship'
        );
        return 'deny';
      }

      // Get recipient's privacy level
      const recipient = await db('users')
        .where({ id: recipientId })
        .select('dm_privacy_level')
        .first();

      // If recipient doesn't exist, deny
      if (!recipient) {
        logger.debug({ senderId, recipientId }, 'DM denied - recipient not found');
        return 'deny';
      }

      // Handle privacy level (default to 'friends_only' if column doesn't exist)
      const privacyLevel: DmPrivacyLevel = recipient.dm_privacy_level || 'friends_only';

      switch (privacyLevel) {
        case 'none':
          // Recipient doesn't accept DMs from anyone
          logger.debug({ senderId, recipientId }, 'DM denied - recipient has DMs disabled');
          return 'deny';

        case 'open':
          // Recipient accepts DMs from anyone
          return 'allow';

        case 'friends_only':
          // Check if users are friends
          const friends = await this.areFriends(senderId, recipientId);
          if (friends) {
            return 'allow';
          }
          logger.debug({ senderId, recipientId }, 'DM denied - friends only and not friends');
          return 'deny';

        default:
          // Unknown privacy level, default to deny
          logger.warn(
            { senderId, recipientId, privacyLevel },
            'Unknown DM privacy level, defaulting to deny'
          );
          return 'deny';
      }
    } catch (error) {
      logger.error({ error, senderId, recipientId }, 'Error checking DM privacy level');
      // Default to deny on error for security
      return 'deny';
    }
  }

  /**
   * Check if two users are friends
   *
   * A friendship exists when both users have a 'friend' connection type
   * in the user_connections table.
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns True if users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      // Check for bidirectional friend connection
      // We only need to check one direction since friendships are created
      // in both directions when accepted
      const connection = await db('user_connections')
        .where({
          user_id: userId1,
          connected_user_id: userId2,
          connection_type: 'friend',
          status: 'active',
        })
        .first();

      return !!connection;
    } catch (error) {
      logger.error({ error, userId1, userId2 }, 'Error checking friend status');
      return false;
    }
  }

  /**
   * Check if userId1 has blocked userId2
   *
   * Note: This is a one-way check. If you need to check if EITHER user
   * has blocked the other, call this method twice with swapped parameters.
   *
   * @param userId1 - The user who may have blocked
   * @param userId2 - The user who may be blocked
   * @returns True if userId1 has blocked userId2
   */
  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    try {
      const connection = await db('user_connections')
        .where({
          user_id: userId1,
          connected_user_id: userId2,
          connection_type: 'blocked',
          status: 'active',
        })
        .first();

      return !!connection;
    } catch (error) {
      logger.error({ error, userId1, userId2 }, 'Error checking block status');
      return false;
    }
  }

  /**
   * Get a user's DM privacy level
   *
   * @param userId - User ID
   * @returns The user's DM privacy level, defaults to 'friends_only' if not set
   */
  async getPrivacyLevel(userId: string): Promise<DmPrivacyLevel> {
    try {
      const user = await db('users')
        .where({ id: userId })
        .select('dm_privacy_level')
        .first();

      return user?.dm_privacy_level || 'friends_only';
    } catch (error) {
      logger.error({ error, userId }, 'Error getting DM privacy level');
      return 'friends_only';
    }
  }

  /**
   * Update a user's DM privacy level
   *
   * @param userId - User ID
   * @param level - New privacy level
   * @returns True if update was successful
   */
  async setPrivacyLevel(userId: string, level: DmPrivacyLevel): Promise<boolean> {
    try {
      await db('users')
        .where({ id: userId })
        .update({ dm_privacy_level: level });

      logger.info({ userId, level }, 'DM privacy level updated');
      return true;
    } catch (error) {
      logger.error({ error, userId, level }, 'Error setting DM privacy level');
      return false;
    }
  }

  /**
   * Get detailed permission info for debugging/logging
   *
   * @param senderId - User ID of the sender
   * @param recipientId - User ID of the recipient
   * @returns Object with detailed permission information
   */
  async getPermissionInfo(
    senderId: string,
    recipientId: string
  ): Promise<{
    canSendDM: boolean;
    recipientPrivacyLevel: DmPrivacyLevel;
    areFriends: boolean;
    senderBlockedRecipient: boolean;
    recipientBlockedSender: boolean;
  }> {
    const [privacyLevel, friends, senderBlockedRecipient, recipientBlockedSender] = await Promise.all([
      this.getPrivacyLevel(recipientId),
      this.areFriends(senderId, recipientId),
      this.isBlocked(senderId, recipientId),
      this.isBlocked(recipientId, senderId),
    ]);

    const canSendDM = !senderBlockedRecipient && !recipientBlockedSender &&
      (privacyLevel === 'open' || (privacyLevel === 'friends_only' && friends));

    return {
      canSendDM,
      recipientPrivacyLevel: privacyLevel,
      areFriends: friends,
      senderBlockedRecipient,
      recipientBlockedSender,
    };
  }

  /**
   * Check if two users share any servers
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns True if users are members of at least one common server
   */
  async shareServer(userId1: string, userId2: string): Promise<boolean> {
    try {
      // Find servers where both users are members
      const sharedServer = await db('server_members as sm1')
        .join('server_members as sm2', 'sm1.server_id', 'sm2.server_id')
        .where('sm1.user_id', userId1)
        .where('sm2.user_id', userId2)
        .select('sm1.server_id')
        .first();

      return !!sharedServer;
    } catch (error) {
      logger.error({ error, userId1, userId2 }, 'Error checking shared servers');
      return false;
    }
  }

  /**
   * Check if user can see another user's online status
   *
   * Online status is visible if:
   * - Users are friends, OR
   * - Users share at least one server
   *
   * @param viewerId - User ID of the viewer
   * @param targetId - User ID whose status is being viewed
   * @returns True if viewer can see target's online status
   */
  async canSeeOnlineStatus(viewerId: string, targetId: string): Promise<boolean> {
    // Self is always visible
    if (viewerId === targetId) {
      return true;
    }

    // Check if friends
    const friends = await this.areFriends(viewerId, targetId);
    if (friends) {
      return true;
    }

    // Check if they share a server
    return this.shareServer(viewerId, targetId);
  }
}

// Export singleton instance
export const dmPermissionService = new DMPermissionService();

// Also export the class for testing purposes
export { DMPermissionService };
