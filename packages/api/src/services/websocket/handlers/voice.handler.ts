/**
 * Voice WebSocket Handler
 * Handles voice-related WebSocket events for WebRTC signaling
 * Directly integrates with Mediasoup service (no separate media server process needed)
 */

import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../config/logger';
import { voiceStateService } from '../../voice/voice-state.service';
import { mediasoupService } from '../../voice/mediasoup.service';
import { channelService } from '../../channel/channel.service';
import { serverService } from '../../server/server.service';
import { serverBanService } from '../../server/server-ban.service';
import { permissionService } from '../../permission';
import { dmChannelService } from '../../dm/dm-channel.service';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';

interface VoiceSession {
  sessionId: string;
  channelId: string;
  userId: string;
  serverId: string;
}

// Store active voice sessions per socket
const socketSessions = new Map<string, VoiceSession>();

class VoiceHandler {
  private initialized = false;

  /**
   * Initialize the voice handler
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('Voice WebSocket handler initialized (direct mediasoup integration)');
  }

  /**
   * Register voice event handlers for a socket
   */
  registerHandlers(socket: Socket): void {
    const userId = socket.data.user?.id;
    if (!userId) return;

    // Join voice channel
    socket.on('voice:join', async (data: { channelId: string }, callback) => {
      try {
        const { channelId } = data;

        // First, try to get server channel
        const channel = await channelService.getChannel(channelId);

        // Check if it's a server channel or DM channel
        const isServerChannel = channel && channel.server_id;

        if (isServerChannel) {
          // Server voice channel
          if (channel.type !== 'voice') {
            return callback?.({ success: false, error: 'Invalid voice channel' });
          }

          // Check if user is a member of the server
          const isMember = await serverService.isMember(channel.server_id, userId);
          if (!isMember) {
            return callback?.({ success: false, error: 'You are not a member of this server' });
          }

          // Check if user is banned from the server
          const isBanned = await serverBanService.isBanned(channel.server_id, userId);
          if (isBanned) {
            return callback?.({ success: false, error: 'You are banned from this server' });
          }

          // Check CONNECT permission
          const hasConnectPermission = await permissionService.hasChannelPermission(userId, channelId, PERMISSION_FLAGS.CONNECT);
          if (!hasConnectPermission) {
            return callback?.({ success: false, error: 'You do not have permission to connect to this voice channel' });
          }
        } else {
          // DM voice channel - verify user is a participant
          const isParticipant = await dmChannelService.isParticipant(channelId, userId);
          if (!isParticipant) {
            return callback?.({ success: false, error: 'You are not a participant of this DM channel' });
          }
        }

        // Determine server ID (null for DM channels)
        const serverId = isServerChannel ? channel!.server_id : null;

        // Create voice state
        const sessionId = uuidv4();
        await voiceStateService.createVoiceState({
          channelId,
          userId,
          serverId: serverId || undefined,
          sessionId,
        });

        // Store session
        socketSessions.set(socket.id, { sessionId, channelId, userId, serverId });

        // Join socket room for the voice channel
        socket.join(`voice:${channelId}`);

        // Join mediasoup room and get router RTP capabilities
        await mediasoupService.getOrCreateRoom(channelId);
        mediasoupService.addParticipant(channelId, userId, sessionId);

        // Get router RTP capabilities
        const rtpCapabilities = await mediasoupService.getRouterRtpCapabilities(channelId);

        // Get existing producers in the room
        const producers = mediasoupService.getRoomProducers(channelId);

        // Get existing users in the channel (excluding current user)
        const existingVoiceStates = await voiceStateService.getChannelVoiceStates(channelId);
        const existingUsers = existingVoiceStates
          .filter(state => state.session_id !== sessionId)
          .map(state => ({
            userId: state.user_id,
            sessionId: state.session_id,
            username: state.user?.username || 'User',
            avatar: state.user?.avatar || null,
            selfMute: state.self_mute,
            selfDeaf: state.self_deaf,
            selfVideo: state.self_video,
            selfStream: state.self_stream,
          }));

        // Notify others in the channel with full user info
        socket.to(`voice:${channelId}`).emit('voice:user_joined', {
          userId,
          sessionId,
          channelId,
          username: socket.data.user?.username || 'User',
          avatar: socket.data.user?.avatar || null,
        });

        // Also broadcast to server room for UI updates (only for server channels)
        if (serverId) {
          socket.to(`server:${serverId}`).emit('voice:user_joined', {
            userId,
            sessionId,
            channelId,
            username: socket.data.user?.username || 'User',
            avatar: socket.data.user?.avatar || null,
          });
        }

        callback?.({
          success: true,
          data: {
            sessionId,
            rtpCapabilities,
            producers,
            existingUsers,
          },
        });

        logger.info({ channelId, userId, sessionId }, 'User joined voice channel');
      } catch (error: any) {
        logger.error({ error }, 'Error joining voice channel');
        callback?.({ success: false, error: error.message });
      }
    });

    // Leave voice channel
    socket.on('voice:leave', async (callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        const { sessionId, channelId, serverId } = session;

        // Leave mediasoup room
        await mediasoupService.removeParticipant(channelId, sessionId);

        // Delete voice state
        await voiceStateService.deleteVoiceState(sessionId);

        // Leave socket room
        socket.leave(`voice:${channelId}`);

        // Notify others in voice channel
        socket.to(`voice:${channelId}`).emit('voice:user_left', { sessionId, channelId });

        // Also broadcast to server room for UI updates (only for server channels)
        if (serverId) {
          socket.to(`server:${serverId}`).emit('voice:user_left', { sessionId, channelId });
        }

        // Cleanup
        socketSessions.delete(socket.id);

        callback?.({ success: true });

        logger.info({ channelId, sessionId }, 'User left voice channel');
      } catch (error: any) {
        logger.error({ error }, 'Error leaving voice channel');
        callback?.({ success: false, error: error.message });
      }
    });

    // Create WebRTC transport
    socket.on('voice:create_transport', async (data: { direction: 'send' | 'recv' }, callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        const transport = await mediasoupService.createTransport(
          session.channelId,
          session.sessionId,
          data.direction
        );

        callback?.({ success: true, data: { transport } });
      } catch (error: any) {
        logger.error({ error }, 'Error creating transport');
        callback?.({ success: false, error: error.message });
      }
    });

    // Connect WebRTC transport
    socket.on('voice:connect_transport', async (data: { transportId: string; dtlsParameters: any }, callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        await mediasoupService.connectTransport(
          session.channelId,
          session.sessionId,
          data.transportId,
          data.dtlsParameters
        );

        callback?.({ success: true });
      } catch (error: any) {
        logger.error({ error }, 'Error connecting transport');
        callback?.({ success: false, error: error.message });
      }
    });

    // Produce media
    socket.on('voice:produce', async (data: { kind: 'audio' | 'video'; rtpParameters: any; appData?: any }, callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        const result = await mediasoupService.produce(
          session.channelId,
          session.sessionId,
          data.kind,
          data.rtpParameters,
          data.appData
        );

        // Update voice state for video/screen
        if (data.kind === 'video') {
          const isScreen = data.appData?.type === 'screen';
          await voiceStateService.updateVoiceState(session.sessionId, {
            selfVideo: !isScreen,
            selfStream: isScreen,
          });

          // Notify others in voice channel
          socket.to(`voice:${session.channelId}`).emit('voice:user_state', {
            sessionId: session.sessionId,
            channelId: session.channelId,
            selfVideo: !isScreen,
            selfStream: isScreen,
          });

          // Also broadcast to server room for UI updates (only for server channels)
          if (session.serverId) {
            socket.to(`server:${session.serverId}`).emit('voice:user_state', {
              sessionId: session.sessionId,
              channelId: session.channelId,
              selfVideo: !isScreen,
              selfStream: isScreen,
            });
          }
        }

        // Notify others about new producer
        socket.to(`voice:${session.channelId}`).emit('voice:new_producer', {
          producerId: result.producerId,
          kind: data.kind,
          sessionId: session.sessionId,
          appData: data.appData,
        });

        callback?.({ success: true, data: result });
      } catch (error: any) {
        logger.error({ error }, 'Error producing');
        callback?.({ success: false, error: error.message });
      }
    });

    // Consume media
    socket.on('voice:consume', async (data: { producerId: string; rtpCapabilities: any }, callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        const result = await mediasoupService.consume(
          session.channelId,
          session.sessionId,
          data.producerId,
          data.rtpCapabilities
        );

        callback?.({ success: true, data: result });
      } catch (error: any) {
        logger.error({ error }, 'Error consuming');
        callback?.({ success: false, error: error.message });
      }
    });

    // Resume consumer
    socket.on('voice:resume_consumer', async (data: { consumerId: string }, callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        await mediasoupService.resumeConsumer(
          session.channelId,
          session.sessionId,
          data.consumerId
        );

        callback?.({ success: true });
      } catch (error: any) {
        logger.error({ error }, 'Error resuming consumer');
        callback?.({ success: false, error: error.message });
      }
    });

    // Close producer
    socket.on('voice:close_producer', async (data: { producerId: string }, callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        await mediasoupService.closeProducer(
          session.channelId,
          session.sessionId,
          data.producerId
        );

        callback?.({ success: true });
      } catch (error: any) {
        logger.error({ error }, 'Error closing producer');
        callback?.({ success: false, error: error.message });
      }
    });

    // Update voice state
    socket.on('voice:state_update', async (data: { selfMute?: boolean; selfDeaf?: boolean }, callback) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        const updated = await voiceStateService.updateVoiceState(session.sessionId, data);

        // Notify others in voice channel
        socket.to(`voice:${session.channelId}`).emit('voice:user_state', {
          sessionId: session.sessionId,
          channelId: session.channelId,
          ...data,
        });

        // Also broadcast to server room for UI updates (only for server channels)
        if (session.serverId) {
          socket.to(`server:${session.serverId}`).emit('voice:user_state', {
            sessionId: session.sessionId,
            channelId: session.channelId,
            ...data,
          });
        }

        callback?.({ success: true, data: updated });
      } catch (error: any) {
        logger.error({ error }, 'Error updating voice state');
        callback?.({ success: false, error: error.message });
      }
    });

    // Speaking indicator
    socket.on('voice:speaking', async (data: { speaking: boolean }) => {
      const session = socketSessions.get(socket.id);
      if (!session) return;

      socket.to(`voice:${session.channelId}`).emit('voice:user_speaking', {
        sessionId: session.sessionId,
        speaking: data.speaking,
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const session = socketSessions.get(socket.id);
      if (session) {
        try {
          await mediasoupService.removeParticipant(session.channelId, session.sessionId);
          await voiceStateService.deleteVoiceState(session.sessionId);

          // Notify others in voice channel
          socket.to(`voice:${session.channelId}`).emit('voice:user_left', {
            sessionId: session.sessionId,
            channelId: session.channelId,
          });

          // Also broadcast to server room for UI updates (only for server channels)
          if (session.serverId) {
            socket.to(`server:${session.serverId}`).emit('voice:user_left', {
              sessionId: session.sessionId,
              channelId: session.channelId,
            });
          }
        } catch (error) {
          logger.error({ error }, 'Error cleaning up voice session on disconnect');
        }
        socketSessions.delete(socket.id);
      }
    });
  }

  /**
   * Close the voice handler
   */
  async close(): Promise<void> {
    this.initialized = false;
    socketSessions.clear();
    logger.info('Voice WebSocket handler closed');
  }
}

export const voiceHandler = new VoiceHandler();
