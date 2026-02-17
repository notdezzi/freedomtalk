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

interface VoiceSession {
  sessionId: string;
  channelId: string;
  userId: string;
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
    const userId = (socket as any).user?.userId;
    if (!userId) return;

    // Join voice channel
    socket.on('voice:join', async (data: { channelId: string }, callback) => {
      try {
        const { channelId } = data;

        // Get channel info
        const channel = await channelService.getChannel(channelId);
        if (!channel || channel.type !== 'voice') {
          return callback?.({ success: false, error: 'Invalid voice channel' });
        }

        // Create voice state
        const sessionId = uuidv4();
        await voiceStateService.createVoiceState({
          channelId,
          userId,
          serverId: channel.server_id,
          sessionId,
        });

        // Store session
        socketSessions.set(socket.id, { sessionId, channelId, userId });

        // Join socket room for the voice channel
        socket.join(`voice:${channelId}`);

        // Join mediasoup room and get router RTP capabilities
        await mediasoupService.getOrCreateRoom(channelId);
        mediasoupService.addParticipant(channelId, userId, sessionId);

        // Get router RTP capabilities
        const rtpCapabilities = await mediasoupService.getRouterRtpCapabilities(channelId);

        // Get existing producers in the room
        const producers = mediasoupService.getRoomProducers(channelId);

        // Notify others in the channel
        socket.to(`voice:${channelId}`).emit('voice:user_joined', {
          userId,
          sessionId,
        });

        callback?.({
          success: true,
          data: {
            sessionId,
            rtpCapabilities,
            producers,
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

        const { sessionId, channelId } = session;

        // Leave mediasoup room
        await mediasoupService.removeParticipant(channelId, sessionId);

        // Delete voice state
        await voiceStateService.deleteVoiceState(sessionId);

        // Leave socket room
        socket.leave(`voice:${channelId}`);

        // Notify others
        socket.to(`voice:${channelId}`).emit('voice:user_left', { sessionId });

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

          // Notify others
          socket.to(`voice:${session.channelId}`).emit('voice:user_state', {
            sessionId: session.sessionId,
            selfVideo: !isScreen,
            selfStream: isScreen,
          });
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

        // Notify others
        socket.to(`voice:${session.channelId}`).emit('voice:user_state', {
          sessionId: session.sessionId,
          ...data,
        });

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
          socket.to(`voice:${session.channelId}`).emit('voice:user_left', { sessionId: session.sessionId });
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
