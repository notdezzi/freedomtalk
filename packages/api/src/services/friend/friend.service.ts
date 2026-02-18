/**
 * Friend Service
 * Handles friend requests, friendships, and user blocking
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';
import { wsServer } from '../websocket/websocket.server';
import { WS_EVENTS } from '@freedomtalk/shared';

export type ConnectionType = 'friend' | 'blocked' | 'pending_incoming' | 'pending_outgoing';

export interface UserConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  connection_type: ConnectionType;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface FriendWithProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  customStatus: string | null;
  friendSince: Date;
}

export interface PendingRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestedAt: Date;
}

export interface SearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isFriend: boolean;
  hasPendingRequest: boolean;
  isBlocked: boolean;
}

// Helper to get user profile for socket events
async function getUserProfile(userId: string) {
  const result = await db('user_profiles')
    .leftJoin('users', 'user_profiles.user_id', 'users.id')
    .where('user_profiles.user_id', userId)
    .select(
      'users.id',
      'users.username',
      'user_profiles.display_name as displayName',
      'user_profiles.avatar_url as avatarUrl'
    )
    .first();
  return result;
}

// Helper to emit socket event to a specific user
function emitToUser(userId: string, event: string, data: unknown) {
  try {
    const io = wsServer.getIO();
    if (io) {
      io.to(`user:${userId}`).emit(event, data);
    }
  } catch (error) {
    console.error(`Failed to emit ${event} to user ${userId}:`, error);
  }
}

class FriendService {
  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(userId: string, targetUserId: string): Promise<UserConnection> {
    // Prevent self-friend
    if (userId === targetUserId) {
      throw new AppError(400, 'INVALID_REQUEST', 'Cannot send friend request to yourself');
    }

    // Check if target user exists
    const targetUser = await db('users').where({ id: targetUserId }).first();
    if (!targetUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Check for existing connection
    const existingConnection = await db('user_connections')
      .where({ user_id: userId, connected_user_id: targetUserId })
      .first();

    if (existingConnection) {
      if (existingConnection.connection_type === 'friend') {
        throw new AppError(400, 'ALREADY_FRIENDS', 'Already friends with this user');
      }
      if (existingConnection.connection_type === 'blocked') {
        throw new AppError(400, 'USER_BLOCKED', 'You have blocked this user');
      }
      if (existingConnection.connection_type === 'pending_outgoing') {
        throw new AppError(400, 'REQUEST_PENDING', 'Friend request already sent');
      }
    }

    // Check if target user has blocked us
    const blockedByTarget = await db('user_connections')
      .where({ user_id: targetUserId, connected_user_id: userId, connection_type: 'blocked' })
      .first();

    if (blockedByTarget) {
      throw new AppError(400, 'CANNOT_SEND_REQUEST', 'Cannot send friend request to this user');
    }

    // Check if there's an incoming request from target user
    const incomingRequest = await db('user_connections')
      .where({ user_id: targetUserId, connected_user_id: userId, connection_type: 'pending_outgoing' })
      .first();

    if (incomingRequest) {
      // Accept the existing request instead of creating a new one
      await db.transaction(async (trx) => {
        // Update the incoming request to be a friendship for the target user
        await trx('user_connections')
          .where({ id: incomingRequest.id })
          .update({ connection_type: 'friend', updated_at: new Date() });

        // Create friendship for current user
        await trx('user_connections').insert({
          id: generateSnowflakeId(),
          user_id: userId,
          connected_user_id: targetUserId,
          connection_type: 'friend',
          status: 'active',
        });
      });

      // Emit friend request accepted event to both users
      const [currentUserProfile, targetUserProfile] = await Promise.all([
        getUserProfile(userId),
        getUserProfile(targetUserId),
      ]);

      emitToUser(userId, WS_EVENTS.FRIEND_REQUEST_ACCEPTED, {
        friend: targetUserProfile,
      });
      emitToUser(targetUserId, WS_EVENTS.FRIEND_REQUEST_ACCEPTED, {
        friend: currentUserProfile,
      });

      return await db('user_connections')
        .where({ user_id: userId, connected_user_id: targetUserId })
        .first() as UserConnection;
    }

    // Create outgoing request for current user and incoming for target
    const connectionId = generateSnowflakeId();
    await db.transaction(async (trx) => {
      // Outgoing request for sender
      await trx('user_connections').insert({
        id: connectionId,
        user_id: userId,
        connected_user_id: targetUserId,
        connection_type: 'pending_outgoing',
        status: 'active',
      });

      // Incoming request for receiver
      await trx('user_connections').insert({
        id: generateSnowflakeId(),
        user_id: targetUserId,
        connected_user_id: userId,
        connection_type: 'pending_incoming',
        status: 'active',
      });
    });

    // Emit friend request received event to target user
    const senderProfile = await getUserProfile(userId);
    emitToUser(targetUserId, WS_EVENTS.FRIEND_REQUEST_RECEIVED, {
      request: {
        ...senderProfile,
        requestedAt: new Date().toISOString(),
      },
    });

    return await db('user_connections').where({ id: connectionId }).first() as UserConnection;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userId: string, requesterId: string): Promise<void> {
    // Check for incoming request
    const incomingRequest = await db('user_connections')
      .where({
        user_id: userId,
        connected_user_id: requesterId,
        connection_type: 'pending_incoming'
      })
      .first();

    if (!incomingRequest) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Friend request not found');
    }

    await db.transaction(async (trx) => {
      // Update incoming request to friendship
      await trx('user_connections')
        .where({ id: incomingRequest.id })
        .update({ connection_type: 'friend', updated_at: new Date() });

      // Update outgoing request to friendship
      await trx('user_connections')
        .where({
          user_id: requesterId,
          connected_user_id: userId,
          connection_type: 'pending_outgoing'
        })
        .update({ connection_type: 'friend', updated_at: new Date() });
    });

    // Emit friend request accepted event to both users
    const [currentUserProfile, requesterProfile] = await Promise.all([
      getUserProfile(userId),
      getUserProfile(requesterId),
    ]);

    emitToUser(userId, WS_EVENTS.FRIEND_REQUEST_ACCEPTED, {
      friend: requesterProfile,
    });
    emitToUser(requesterId, WS_EVENTS.FRIEND_REQUEST_ACCEPTED, {
      friend: currentUserProfile,
    });
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(userId: string, requesterId: string): Promise<void> {
    await db.transaction(async (trx) => {
      // Delete incoming request
      await trx('user_connections')
        .where({
          user_id: userId,
          connected_user_id: requesterId,
          connection_type: 'pending_incoming'
        })
        .delete();

      // Delete outgoing request
      await trx('user_connections')
        .where({
          user_id: requesterId,
          connected_user_id: userId,
          connection_type: 'pending_outgoing'
        })
        .delete();
    });

    // Emit friend request rejected event to requester
    emitToUser(requesterId, WS_EVENTS.FRIEND_REQUEST_REJECTED, {
      userId,
    });
  }

  /**
   * Cancel a friend request (sender cancels)
   */
  async cancelFriendRequest(userId: string, targetUserId: string): Promise<void> {
    await db.transaction(async (trx) => {
      // Delete outgoing request
      await trx('user_connections')
        .where({
          user_id: userId,
          connected_user_id: targetUserId,
          connection_type: 'pending_outgoing'
        })
        .delete();

      // Delete incoming request for target
      await trx('user_connections')
        .where({
          user_id: targetUserId,
          connected_user_id: userId,
          connection_type: 'pending_incoming'
        })
        .delete();
    });

    // Emit friend request cancelled event to target user
    emitToUser(targetUserId, WS_EVENTS.FRIEND_REQUEST_CANCELLED, {
      userId,
    });
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    await db.transaction(async (trx) => {
      // Remove friendship from both sides
      await trx('user_connections')
        .where({
          user_id: userId,
          connected_user_id: friendId,
          connection_type: 'friend'
        })
        .delete();

      await trx('user_connections')
        .where({
          user_id: friendId,
          connected_user_id: userId,
          connection_type: 'friend'
        })
        .delete();
    });

    // Emit friend removed event to both users
    emitToUser(userId, WS_EVENTS.FRIEND_REMOVED, { friendId });
    emitToUser(friendId, WS_EVENTS.FRIEND_REMOVED, { friendId: userId });
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, targetUserId: string): Promise<UserConnection> {
    if (userId === targetUserId) {
      throw new AppError(400, 'INVALID_REQUEST', 'Cannot block yourself');
    }

    // Remove any existing connection first
    await db('user_connections')
      .where({ user_id: userId, connected_user_id: targetUserId })
      .delete();

    await db('user_connections')
      .where({ user_id: targetUserId, connected_user_id: userId })
      .delete();

    const connectionId = generateSnowflakeId();
    await db('user_connections').insert({
      id: connectionId,
      user_id: userId,
      connected_user_id: targetUserId,
      connection_type: 'blocked',
      status: 'active',
    });

    // Emit user blocked event
    const blockedUserProfile = await getUserProfile(targetUserId);
    emitToUser(userId, WS_EVENTS.USER_BLOCKED, {
      user: blockedUserProfile,
    });

    return await db('user_connections').where({ id: connectionId }).first() as UserConnection;
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    await db('user_connections')
      .where({
        user_id: userId,
        connected_user_id: targetUserId,
        connection_type: 'blocked'
      })
      .delete();

    // Emit user unblocked event
    emitToUser(userId, WS_EVENTS.USER_UNBLOCKED, {
      userId: targetUserId,
    });
  }

  /**
   * Get all friends for a user
   */
  async getFriends(userId: string): Promise<FriendWithProfile[]> {
    const connections = await db('user_connections')
      .where({
        user_id: userId,
        connection_type: 'friend',
        status: 'active'
      });

    if (connections.length === 0) {
      return [];
    }

    const friendIds = connections.map(c => c.connected_user_id);
    const profiles = await db('user_profiles')
      .leftJoin('users', 'user_profiles.user_id', 'users.id')
      .whereIn('user_profiles.user_id', friendIds)
      .select(
        'users.id',
        'users.username',
        'user_profiles.display_name',
        'user_profiles.avatar_url',
        'user_profiles.custom_status'
      );

    const connectionMap = new Map(connections.map(c => [c.connected_user_id, c.created_at]));

    return profiles.map(p => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      customStatus: p.custom_status,
      friendSince: connectionMap.get(p.id)!,
    }));
  }

  /**
   * Get pending friend requests (incoming and outgoing)
   */
  async getPendingRequests(userId: string): Promise<{ incoming: PendingRequest[]; outgoing: PendingRequest[] }> {
    // Get incoming requests
    const incomingConnections = await db('user_connections')
      .where({
        connected_user_id: userId,
        connection_type: 'pending_outgoing',
        status: 'active'
      });

    // Get outgoing requests
    const outgoingConnections = await db('user_connections')
      .where({
        user_id: userId,
        connection_type: 'pending_outgoing',
        status: 'active'
      });

    const incomingUserIds = incomingConnections.map(c => c.user_id);
    const outgoingUserIds = outgoingConnections.map(c => c.connected_user_id);

    const allUserIds = [...incomingUserIds, ...outgoingUserIds];

    if (allUserIds.length === 0) {
      return { incoming: [], outgoing: [] };
    }

    const profiles = await db('user_profiles')
      .leftJoin('users', 'user_profiles.user_id', 'users.id')
      .whereIn('user_profiles.user_id', allUserIds)
      .select(
        'users.id',
        'users.username',
        'user_profiles.display_name',
        'user_profiles.avatar_url'
      );

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    const incomingConnectionMap = new Map(incomingConnections.map(c => [c.user_id, c.created_at]));
    const outgoingConnectionMap = new Map(outgoingConnections.map(c => [c.connected_user_id, c.created_at]));

    const incoming: PendingRequest[] = incomingUserIds.map(userId => {
      const profile = profileMap.get(userId);
      return {
        id: userId,
        userId: userId,
        username: profile?.username || '',
        displayName: profile?.display_name,
        avatarUrl: profile?.avatar_url,
        requestedAt: incomingConnectionMap.get(userId)!,
      };
    });

    const outgoing: PendingRequest[] = outgoingUserIds.map(targetUserId => {
      const profile = profileMap.get(targetUserId);
      return {
        id: targetUserId,
        userId: targetUserId,
        username: profile?.username || '',
        displayName: profile?.display_name,
        avatarUrl: profile?.avatar_url,
        requestedAt: outgoingConnectionMap.get(targetUserId)!,
      };
    });

    return { incoming, outgoing };
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<Array<{ id: string; username: string; displayName: string | null; avatarUrl: string | null }>> {
    const connections = await db('user_connections')
      .where({
        user_id: userId,
        connection_type: 'blocked',
        status: 'active'
      });

    if (connections.length === 0) {
      return [];
    }

    const blockedIds = connections.map(c => c.connected_user_id);
    const profiles = await db('user_profiles')
      .leftJoin('users', 'user_profiles.user_id', 'users.id')
      .whereIn('user_profiles.user_id', blockedIds)
      .select(
        'users.id',
        'users.username',
        'user_profiles.display_name',
        'user_profiles.avatar_url'
      );

    return profiles.map(p => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
    }));
  }

  /**
   * Search within user's friends list only
   */
  async searchFriendsList(userId: string, query: string): Promise<FriendWithProfile[]> {
    if (!query || query.length < 1) {
      // Return all friends if no query
      return this.getFriends(userId);
    }

    // Get all friend connections
    const connections = await db('user_connections')
      .where({
        user_id: userId,
        connection_type: 'friend',
        status: 'active'
      });

    if (connections.length === 0) {
      return [];
    }

    const friendIds = connections.map(c => c.connected_user_id);

    // Search within friends by username or display name
    const profiles = await db('user_profiles')
      .leftJoin('users', 'user_profiles.user_id', 'users.id')
      .whereIn('user_profiles.user_id', friendIds)
      .where(function() {
        this.whereRaw('users.username ILIKE ?', [`%${query}%`])
          .orWhereRaw('user_profiles.display_name ILIKE ?', [`%${query}%`]);
      })
      .select(
        'users.id',
        'users.username',
        'user_profiles.display_name',
        'user_profiles.avatar_url',
        'user_profiles.custom_status'
      );

    const connectionMap = new Map(connections.map(c => [c.connected_user_id, c.created_at]));

    return profiles.map(p => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      customStatus: p.custom_status,
      friendSince: connectionMap.get(p.id)!,
    }));
  }

  /**
   * Search for users by username or display name
   */
  async searchUsers(userId: string, query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    // Search by username or display name (case insensitive, partial match)
    // Use raw query for better debugging
    const users = await db.raw(`
      SELECT u.id, u.username, up.display_name, up.avatar_url
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE (u.username ILIKE ? OR up.display_name ILIKE ?)
        AND u.id != ?
        AND u.account_status != 'deleted'
      LIMIT 20
    `, [`%${query}%`, `%${query}%`, userId]);

    // Handle PostgreSQL result format
    const rows = users.rows || users;

    if (rows.length === 0) {
      return [];
    }

    const userIds = rows.map((u: { id: string }) => u.id);

    // Get all connections for these users
    const connections = await db('user_connections')
      .where('user_id', userId)
      .whereIn('connected_user_id', userIds);

    const connectionMap = new Map(connections.map(c => [c.connected_user_id, c.connection_type]));

    return rows.map((u: { id: string; username: string; display_name: string | null; avatar_url: string | null }) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      isFriend: connectionMap.get(u.id) === 'friend',
      hasPendingRequest: connectionMap.get(u.id) === 'pending_outgoing' || connectionMap.get(u.id) === 'pending_incoming',
      isBlocked: connectionMap.get(u.id) === 'blocked',
    }));
  }

  /**
   * Get friendship status with another user
   */
  async getFriendshipStatus(userId: string, targetUserId: string): Promise<{
    isFriend: boolean;
    hasIncomingRequest: boolean;
    hasOutgoingRequest: boolean;
    isBlocked: boolean;
  }> {
    const connection = await db('user_connections')
      .where({ user_id: userId, connected_user_id: targetUserId })
      .first();

    return {
      isFriend: connection?.connection_type === 'friend',
      hasIncomingRequest: connection?.connection_type === 'pending_incoming',
      hasOutgoingRequest: connection?.connection_type === 'pending_outgoing',
      isBlocked: connection?.connection_type === 'blocked',
    };
  }
}

export const friendService = new FriendService();
