/**
 * DM Channel Types
 */

import { db } from '../../config/database';
import { dmPermissionService } from './dm-permission.service';
import { presenceManager } from '../websocket/presence.manager';

/**
 * DM Channel type enum
 */
export type DMChannelType = 'dm' | 'group_dm';

/**
 * DM Channel interface matching database schema
 */
export interface DMChannel {
  id: string;
  type: DMChannelType;
  name: string | null;
  icon_url: string | null;
  owner_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Recipient with user profile data
 */
export interface DMRecipientResponse {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isOnline?: boolean;
}

/**
 * DM Channel response for API
 */
export interface DMChannelResponse {
  id: string;
  type: DMChannelType;
  name: string | null;
  iconUrl: string | null;
  ownerId: string | null;
  recipients: DMRecipientResponse[];
  lastMessageId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert DM channel to API response format with user profile data
 * Includes online status with privacy controls
 */
export async function toDMChannelResponse(
  dmChannel: any,
  participants: any[],
  currentUserId?: string
): Promise<DMChannelResponse> {
  // Get user IDs from participants
  const userIds = participants
    .filter((p) => p.is_active)
    .map((p) => p.user_id);

  // Fetch user profiles for all participants
  let userProfiles: any[] = [];
  if (userIds.length > 0) {
    userProfiles = await db('user_profiles')
      .join('users', 'user_profiles.user_id', 'users.id')
      .whereIn('user_profiles.user_id', userIds)
      .select(
        'user_profiles.user_id as id',
        'users.username as username',
        'user_profiles.display_name as displayName',
        'user_profiles.avatar_url as avatar'
      );
  }

  // Create a map for quick lookup
  const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

  // Get online status for all participants (with privacy check)
  let onlineStatusMap = new Map<string, boolean>();
  if (currentUserId && userIds.length > 0) {
    // Check which users the current user can see online status for
    const visibilityChecks = await Promise.all(
      userIds
        .filter(id => id !== currentUserId)
        .map(async (userId) => ({
          userId,
          canSee: await dmPermissionService.canSeeOnlineStatus(currentUserId, userId),
        }))
    );

    // Only fetch presence for users we can see
    const visibleUserIds = visibilityChecks
      .filter(check => check.canSee)
      .map(check => check.userId);

    if (visibleUserIds.length > 0) {
      const presenceMap = await presenceManager.getBulkPresence(visibleUserIds);
      presenceMap.forEach((status, userId) => {
        onlineStatusMap.set(userId, status === 'online');
      });
    }
  }

  return {
    id: dmChannel.id,
    type: dmChannel.type,
    name: dmChannel.name,
    iconUrl: dmChannel.icon_url,
    ownerId: dmChannel.owner_id,
    recipients: userIds.map((userId) => {
      const profile = profileMap.get(userId);
      return {
        id: userId,
        username: profile?.username || 'Unknown User',
        displayName: profile?.displayName || null,
        avatar: profile?.avatar || null,
        isOnline: onlineStatusMap.get(userId) ?? false,
      };
    }),
    lastMessageId: dmChannel.last_message_id || null,
    lastMessageAt: dmChannel.last_message_at ? dmChannel.last_message_at.toISOString() : null,
    createdAt: dmChannel.created_at.toISOString(),
    updatedAt: dmChannel.updated_at.toISOString(),
  };
}
