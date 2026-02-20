/**
 * Voice State Service
 * Manages voice channel state and user presence
 */

import { db } from '../../config/database';
import { generateSnowflakeId } from '../../utils/snowflake';
import { AppError } from '../../utils/errors';

export interface VoiceState {
  id: string;
  channel_id: string;
  user_id: string;
  server_id: string;
  session_id: string;
  self_mute: boolean;
  self_deaf: boolean;
  self_video: boolean;
  self_stream: boolean;
  suppress: boolean;
  request_to_speak_timestamp: Date | null;
  joined_at: Date;
}

export interface VoiceStateWithUser extends VoiceState {
  user?: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

export interface CreateVoiceStateInput {
  channelId: string;
  userId: string;
  serverId?: string; // Optional for DM channels
  sessionId: string;
  selfMute?: boolean;
  selfDeaf?: boolean;
  selfVideo?: boolean;
}

export interface UpdateVoiceStateInput {
  selfMute?: boolean;
  selfDeaf?: boolean;
  selfVideo?: boolean;
  selfStream?: boolean;
  suppress?: boolean;
}

class VoiceStateService {
  private readonly MAX_USERS_PER_CHANNEL = 25;

  /**
   * Create a voice state (user joins voice channel)
   */
  async createVoiceState(input: CreateVoiceStateInput): Promise<VoiceState> {
    // For server channels, check if user is already in a voice channel in this server
    // For DM channels, skip this check since there's no server
    let existingState = null;
    if (input.serverId) {
      existingState = await this.getUserVoiceStateInServer(input.serverId, input.userId);
    }
    if (existingState) {
      // Move to new channel by updating existing state
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

    // Check channel capacity
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

  /**
   * Delete a voice state (user leaves voice channel)
   */
  async deleteVoiceState(sessionId: string): Promise<void> {
    await db('voice_states')
      .where({ session_id: sessionId })
      .delete();
  }

  /**
   * Delete voice state by user and channel
   */
  async deleteVoiceStateByUserChannel(channelId: string, userId: string): Promise<void> {
    await db('voice_states')
      .where({ channel_id: channelId, user_id: userId })
      .delete();
  }

  /**
   * Update voice state
   */
  async updateVoiceState(sessionId: string, input: UpdateVoiceStateInput): Promise<VoiceState> {
    const existing = await this.getVoiceStateBySession(sessionId);
    if (!existing) {
      throw new AppError(404, 'VOICE_STATE_NOT_FOUND', 'Voice state not found');
    }

    const updateData: Record<string, any> = {};

    if (input.selfMute !== undefined) updateData.self_mute = input.selfMute;
    if (input.selfDeaf !== undefined) updateData.self_deaf = input.selfDeaf;
    if (input.selfVideo !== undefined) updateData.self_video = input.selfVideo;
    if (input.selfStream !== undefined) updateData.self_stream = input.selfStream;
    if (input.suppress !== undefined) updateData.suppress = input.suppress;

    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    const [updated] = await db('voice_states')
      .where({ session_id: sessionId })
      .update(updateData)
      .returning('*');

    return updated;
  }

  /**
   * Get voice state by session ID
   */
  async getVoiceStateBySession(sessionId: string): Promise<VoiceState | null> {
    const state = await db('voice_states')
      .where({ session_id: sessionId })
      .first();

    return state || null;
  }

  /**
   * Get voice state by user ID
   */
  async getVoiceStateByUserId(userId: string): Promise<VoiceState | null> {
    const state = await db('voice_states')
      .where({ user_id: userId })
      .first();

    return state || null;
  }

  /**
   * Get user's voice state in a specific server
   */
  async getUserVoiceStateInServer(serverId: string, userId: string): Promise<VoiceState | null> {
    const state = await db('voice_states')
      .where({ server_id: serverId, user_id: userId })
      .first();

    return state || null;
  }

  /**
   * Get all voice states for a channel (who's in the channel)
   */
  async getChannelVoiceStates(channelId: string): Promise<VoiceStateWithUser[]> {
    const states = await db('voice_states')
      .where({ channel_id: channelId })
      .orderBy('joined_at', 'asc');

    // If no states, return empty array
    if (states.length === 0) {
      return [];
    }

    // Get user info for each state (join with user_profiles for avatar)
    const userIds = states.map(s => s.user_id);
    const users = userIds.length > 0
      ? await db('users')
          .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
          .whereIn('users.id', userIds)
          .select(
            'users.id',
            'users.username',
            'user_profiles.avatar_url as avatar',
            'user_profiles.display_name'
          )
      : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    return states.map(state => ({
      ...state,
      user: userMap.get(state.user_id) ? {
        id: state.user_id,
        username: userMap.get(state.user_id)!.username,
        avatar: userMap.get(state.user_id)!.avatar,
        displayName: userMap.get(state.user_id)!.display_name,
      } : undefined,
    }));
  }

  /**
   * Get all voice states for a server
   */
  async getServerVoiceStates(serverId: string): Promise<VoiceState[]> {
    return db('voice_states')
      .where({ server_id: serverId })
      .orderBy('joined_at', 'asc');
  }

  /**
   * Get user count in a channel
   */
  async getChannelUserCount(channelId: string): Promise<number> {
    const result = await db('voice_states')
      .where({ channel_id: channelId })
      .count('id as count')
      .first();

    return parseInt(String(result?.count || 0), 10);
  }

  /**
   * Move user to different voice channel
   */
  async moveUser(sessionId: string, targetChannelId: string): Promise<VoiceState> {
    const existing = await this.getVoiceStateBySession(sessionId);
    if (!existing) {
      throw new AppError(404, 'VOICE_STATE_NOT_FOUND', 'Voice state not found');
    }

    // Check target channel capacity
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

  /**
   * Server mute/deafen a user
   */
  async suppressUser(sessionId: string, suppress: boolean): Promise<VoiceState> {
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

  /**
   * Kick user from voice channel
   */
  async kickUser(sessionId: string): Promise<void> {
    await this.deleteVoiceState(sessionId);
  }

  /**
   * Get active streams in a channel
   */
  async getChannelStreams(channelId: string): Promise<{ video: number; screen: number }> {
    const states = await db('voice_states')
      .where({ channel_id: channelId });

    return {
      video: states.filter(s => s.self_video).length,
      screen: states.filter(s => s.self_stream).length,
    };
  }
}

export const voiceStateService = new VoiceStateService();
