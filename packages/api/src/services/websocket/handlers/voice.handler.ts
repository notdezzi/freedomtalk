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
import { dmPermissionService } from '../../dm/dm-permission.service';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';

interface VoiceSession {
  sessionId: string;
  channelId: string;
  userId: string;
  serverId: string | null;
}

// Store active voice sessions per socket
const socketSessions = new Map<string, VoiceSession>();

/**
 * Shape of a socket event handler. Handlers may take a payload and/or an
 * acknowledgment callback depending on the event.
 */
type VoiceEventHandler = (...args: any[]) => void | Promise<void>;

/**
 * Optional event wrapper (e.g. rate limiting) applied to every registered
 * event except `disconnect`.
 */
type EventWrapper = (event: string, handler: VoiceEventHandler) => void;

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
   * Tear down a voice session: remove the mediasoup participant (which closes
   * its transports), delete the voice state row, notify the channel/server
   * rooms, leave the socket room and drop the session mapping. Best-effort —
   * media/DB failures are logged, never thrown.
   */
  private async cleanupVoiceSession(socket: Socket, session: VoiceSession): Promise<void> {
    try {
      await mediasoupService.removeParticipant(session.channelId, session.sessionId);
      await voiceStateService.deleteVoiceState(session.sessionId);

      // Notify listeners exactly once (server room covers server-channel
      // participants; dual delivery would duplicate UI entries)
      if (session.serverId) {
        socket.to(`server:${session.serverId}`).emit('voice:user_left', {
          sessionId: session.sessionId,
          channelId: session.channelId,
        });
      } else {
        socket.to(`voice:${session.channelId}`).emit('voice:user_left', {
          sessionId: session.sessionId,
          channelId: session.channelId,
        });
        // For DM channels, check if the call has ended (no more participants)
        const remainingStates = await voiceStateService.getChannelVoiceStates(session.channelId);
        if (remainingStates.length === 0) {
          const participantIds = await dmChannelService.getParticipantUserIds(session.channelId);
          for (const participantId of participantIds) {
            socket.to(`user:${participantId}`).emit('dm:call_ended', {
              channelId: session.channelId,
            });
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error cleaning up voice session');
    }

    socket.leave(`voice:${session.channelId}`);
    socketSessions.delete(socket.id);
  }

  /**
   * Register voice event handlers for a socket.
   *
   * @param socket - Socket instance
   * @param wrapEvent - Optional wrapper applied to each event registration
   *   (used by the WebSocket layer to rate limit events)
   */
  registerHandlers(socket: Socket, wrapEvent?: EventWrapper): void {
    const userId = socket.data.user?.id;
    if (!userId) return;

    const on: EventWrapper = wrapEvent ?? ((event, handler) => {
      socket.on(event, handler as (...args: any[]) => void);
    });

    // Join voice channel
    on('voice:join', async (data: { channelId: string }, callback: (response?: any) => void) => {
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

          // DM privacy/block check: don't ring participants who have blocked
          // the caller or whose DM privacy level disallows contact from them
          const recipientIds = await dmChannelService.getParticipantUserIds(channelId);
          for (const recipientId of recipientIds) {
            if (recipientId === userId) continue;
            const canCall = await dmPermissionService.canSendDM(userId, recipientId);
            if (!canCall) {
              socket.emit('dm:call_error', { code: 'DM_BLOCKED', channelId });
              return callback?.({ success: false, error: 'You cannot call this user' });
            }
          }
        }

        // Tear down any existing session for this socket before creating a
        // new one (channel switch without an explicit voice:leave) so media
        // transports and voice state rows don't leak
        const existingSession = socketSessions.get(socket.id);
        if (existingSession) {
          await this.cleanupVoiceSession(socket, existingSession);
        }

        // Determine server ID (null for DM channels)
        const serverId = isServerChannel ? channel!.server_id : null;

        // Create voice state
        const sessionId = uuidv4();
        await voiceStateService.createVoiceState({
          channelId,
          userId,
          serverId: serverId ?? undefined,
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
            suppress: state.suppress,
          }));

        // Notify listeners exactly once. Server-channel participants always
        // sit in the server room (the web client joins it on every server
        // page), so the server room is the single broadcast target — emitting
        // to both `voice:` and `server:` rooms double-delivers to anyone in
        // both (duplicate participants in the voice UI).
        if (serverId) {
          socket.to(`server:${serverId}`).emit('voice:user_joined', {
            userId,
            sessionId,
            channelId,
            username: socket.data.user?.username || 'User',
            avatar: socket.data.user?.avatar || null,
          });
        } else {
          // DM call: no server room exists, so notify the voice room directly
          socket.to(`voice:${channelId}`).emit('voice:user_joined', {
            userId,
            sessionId,
            channelId,
            username: socket.data.user?.username || 'User',
            avatar: socket.data.user?.avatar || null,
          });
          // Also notify all participants of the call
          // This allows the recipient to see the incoming call even if not in the voice channel
          const participantIds = await dmChannelService.getParticipantUserIds(channelId);
          for (const participantId of participantIds) {
            if (participantId !== userId) {
              // Emit to the participant's user room
              socket.to(`user:${participantId}`).emit('dm:call_started', {
                channelId,
                callerId: userId,
                callerUsername: socket.data.user?.username || 'User',
                callerAvatar: socket.data.user?.avatar || null,
              });
            }
          }
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
    on('voice:leave', async (callback: (response?: any) => void) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        const { sessionId, channelId } = session;

        await this.cleanupVoiceSession(socket, session);

        callback?.({ success: true });

        logger.info({ channelId, sessionId }, 'User left voice channel');
      } catch (error: any) {
        logger.error({ error }, 'Error leaving voice channel');
        callback?.({ success: false, error: error.message });
      }
    });

    // Decline an incoming DM call. Unlike voice:leave this works for a
    // callee who never joined, so the caller's ringing UI stops
    // immediately instead of waiting out its 30s auto-dismiss.
    on('dm:call_reject', async (data: { channelId?: string }) => {
      try {
        const channelId = data?.channelId;
        if (!channelId || typeof channelId !== 'string') {
          return;
        }

        // Only DM participants may reject a call in that channel
        const isParticipant = await dmChannelService.isParticipant(channelId, userId);
        if (!isParticipant) {
          return;
        }

        const participantIds = await dmChannelService.getParticipantUserIds(channelId);
        for (const participantId of participantIds) {
          if (participantId === userId) continue;
          socket.to(`user:${participantId}`).emit('dm:call_reject', {
            channelId,
            userId,
          });
        }
      } catch (error: any) {
        logger.error({ error, userId }, 'Error handling dm:call_reject');
      }
    });

    // Create WebRTC transport
    on('voice:create_transport', async (data: { direction: 'send' | 'recv' }, callback: (response?: any) => void) => {
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
    on('voice:connect_transport', async (data: { transportId: string; dtlsParameters: any }, callback: (response?: any) => void) => {
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
    on('voice:produce', async (data: { kind: 'audio' | 'video'; rtpParameters: any; appData?: any }, callback: (response?: any) => void) => {
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

          // Notify listeners exactly once (server room covers server-channel
          // participants; dual delivery would duplicate UI updates)
          const statePayload = {
            sessionId: session.sessionId,
            channelId: session.channelId,
            selfVideo: !isScreen,
            selfStream: isScreen,
          };
          if (session.serverId) {
            socket.to(`server:${session.serverId}`).emit('voice:user_state', statePayload);
          } else {
            socket.to(`voice:${session.channelId}`).emit('voice:user_state', statePayload);
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
    on('voice:consume', async (data: { producerId: string; rtpCapabilities: any }, callback: (response?: any) => void) => {
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
    on('voice:resume_consumer', async (data: { consumerId: string }, callback: (response?: any) => void) => {
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
    on('voice:close_producer', async (data: { producerId: string }, callback: (response?: any) => void) => {
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
    on('voice:state_update', async (data: { selfMute?: boolean; selfDeaf?: boolean }, callback: (response?: any) => void) => {
      try {
        const session = socketSessions.get(socket.id);
        if (!session) {
          return callback?.({ success: false, error: 'Not in a voice channel' });
        }

        const updated = await voiceStateService.updateVoiceState(session.sessionId, data);

        // Notify listeners exactly once (include server-level suppress so
        // clients can render the muted state; dual delivery would duplicate
        // UI updates for anyone in both rooms)
        const statePayload = {
          sessionId: session.sessionId,
          channelId: session.channelId,
          ...data,
          suppress: updated.suppress,
        };
        if (session.serverId) {
          socket.to(`server:${session.serverId}`).emit('voice:user_state', statePayload);
        } else {
          socket.to(`voice:${session.channelId}`).emit('voice:user_state', statePayload);
        }

        callback?.({ success: true, data: updated });
      } catch (error: any) {
        logger.error({ error }, 'Error updating voice state');
        callback?.({ success: false, error: error.message });
      }
    });

    // Speaking indicator
    on('voice:speaking', async (data: { speaking: boolean }) => {
      const session = socketSessions.get(socket.id);
      if (!session) return;

      const speakingPayload = {
        sessionId: session.sessionId,
        speaking: data.speaking,
      };
      if (session.serverId) {
        socket.to(`server:${session.serverId}`).emit('voice:user_speaking', speakingPayload);
      } else {
        socket.to(`voice:${session.channelId}`).emit('voice:user_speaking', speakingPayload);
      }
    });

    // Handle disconnect (never rate limited)
    socket.on('disconnect', async () => {
      const session = socketSessions.get(socket.id);
      if (session) {
        await this.cleanupVoiceSession(socket, session);
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
