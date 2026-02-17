/**
 * Signaling Handler
 * Handles communication between API server and Media server via Redis
 */

import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { mediasoupService } from './mediasoup.service';

const REDIS_CHANNEL_REQUESTS = 'voice:signaling:request';
const REDIS_CHANNEL_RESPONSES = 'voice:signaling:response';

export interface SignalingMessage {
  type: string;
  channelId: string;
  sessionId?: string;
  userId?: string;
  data?: any;
  requestId?: string;
}

export interface SignalingResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
}

class SignalingHandler {
  private initialized = false;

  /**
   * Initialize the signaling handler
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Subscribe to requests channel with listener
    await redisClient.subscribe(REDIS_CHANNEL_REQUESTS, (message: string, _channel: string) => {
      this.handleMessage(message);
    });

    this.initialized = true;
    logger.info('Voice signaling handler initialized');
  }

  /**
   * Handle incoming signaling message from API server
   */
  private async handleMessage(message: string): Promise<void> {
    try {
      const msg: SignalingMessage = JSON.parse(message);
      logger.debug({ type: msg.type, channelId: msg.channelId }, 'Received signaling message');

      let response: SignalingResponse;

      switch (msg.type) {
        case 'get_router_rtp_capabilities':
          response = await this.handleGetRouterRtpCapabilities(msg);
          break;

        case 'create_transport':
          response = await this.handleCreateTransport(msg);
          break;

        case 'connect_transport':
          response = await this.handleConnectTransport(msg);
          break;

        case 'produce':
          response = await this.handleProduce(msg);
          break;

        case 'consume':
          response = await this.handleConsume(msg);
          break;

        case 'resume_consumer':
          response = await this.handleResumeConsumer(msg);
          break;

        case 'close_producer':
          response = await this.handleCloseProducer(msg);
          break;

        case 'close_consumer':
          response = await this.handleCloseConsumer(msg);
          break;

        case 'join_room':
          response = await this.handleJoinRoom(msg);
          break;

        case 'leave_room':
          response = await this.handleLeaveRoom(msg);
          break;

        case 'get_producers':
          response = await this.handleGetProducers(msg);
          break;

        default:
          response = {
            requestId: msg.requestId || '',
            success: false,
            error: `Unknown message type: ${msg.type}`,
          };
      }

      // Send response
      await redisClient.publish(REDIS_CHANNEL_RESPONSES, JSON.stringify(response));

    } catch (error) {
      logger.error({ error }, 'Error handling signaling message');
    }
  }

  private async handleGetRouterRtpCapabilities(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const rtpCapabilities = await mediasoupService.getRouterRtpCapabilities(msg.channelId);
      return {
        requestId: msg.requestId || '',
        success: true,
        data: { rtpCapabilities },
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleCreateTransport(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const { direction } = msg.data || {};
      const transport = await mediasoupService.createTransport(
        msg.channelId,
        msg.sessionId!,
        direction
      );
      return {
        requestId: msg.requestId || '',
        success: true,
        data: { transport },
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleConnectTransport(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const { transportId, dtlsParameters } = msg.data || {};
      await mediasoupService.connectTransport(
        msg.channelId,
        msg.sessionId!,
        transportId,
        dtlsParameters
      );
      return {
        requestId: msg.requestId || '',
        success: true,
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleProduce(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const { kind, rtpParameters, appData } = msg.data || {};
      const result = await mediasoupService.produce(
        msg.channelId,
        msg.sessionId!,
        kind,
        rtpParameters,
        appData
      );
      return {
        requestId: msg.requestId || '',
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleConsume(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const { producerId, rtpCapabilities } = msg.data || {};
      const result = await mediasoupService.consume(
        msg.channelId,
        msg.sessionId!,
        producerId,
        rtpCapabilities
      );
      return {
        requestId: msg.requestId || '',
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleResumeConsumer(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const { consumerId } = msg.data || {};
      await mediasoupService.resumeConsumer(msg.channelId, msg.sessionId!, consumerId);
      return {
        requestId: msg.requestId || '',
        success: true,
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleCloseProducer(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const { producerId } = msg.data || {};
      await mediasoupService.closeProducer(msg.channelId, msg.sessionId!, producerId);
      return {
        requestId: msg.requestId || '',
        success: true,
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleCloseConsumer(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const { consumerId } = msg.data || {};
      await mediasoupService.closeConsumer(msg.channelId, msg.sessionId!, consumerId);
      return {
        requestId: msg.requestId || '',
        success: true,
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleJoinRoom(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      // Ensure room exists and add participant
      await mediasoupService.getOrCreateRoom(msg.channelId);
      mediasoupService.addParticipant(msg.channelId, msg.userId!, msg.sessionId!);

      // Get existing producers for new participant
      const producers = mediasoupService.getRoomProducers(msg.channelId);

      return {
        requestId: msg.requestId || '',
        success: true,
        data: { producers },
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleLeaveRoom(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      await mediasoupService.removeParticipant(msg.channelId, msg.sessionId!);
      return {
        requestId: msg.requestId || '',
        success: true,
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  private async handleGetProducers(msg: SignalingMessage): Promise<SignalingResponse> {
    try {
      const producers = mediasoupService.getRoomProducers(msg.channelId);
      return {
        requestId: msg.requestId || '',
        success: true,
        data: { producers },
      };
    } catch (error: any) {
      return {
        requestId: msg.requestId || '',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Close the signaling handler
   */
  async close(): Promise<void> {
    await redisClient.unsubscribe();
    this.initialized = false;
    logger.info('Voice signaling handler closed');
  }
}

export const signalingHandler = new SignalingHandler();
