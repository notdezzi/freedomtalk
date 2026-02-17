/**
 * Mediasoup Service
 * Handles WebRTC media routing via Mediasoup SFU
 */

import * as mediasoup from 'mediasoup';
import { logger } from '../../config/logger';

// Re-export types we need
type Worker = mediasoup.types.Worker;
type Router = mediasoup.types.Router;
type Transport = mediasoup.types.Transport;
type Producer = mediasoup.types.Producer;
type Consumer = mediasoup.types.Consumer;
type RtpCapabilities = mediasoup.types.RtpCapabilities;

export interface MediasoupConfig {
  numWorkers: number;
  announcedIp?: string;
  rtcMinPort: number;
  rtcMaxPort: number;
}

export interface VoiceRoom {
  router: Router;
  channelId: string;
  participants: Map<string, Participant>;
}

export interface Participant {
  userId: string;
  sessionId: string;
  sendTransport?: Transport;
  recvTransport?: Transport;
  audioProducer?: Producer;
  videoProducer?: Producer;
  screenProducer?: Producer;
  consumers: Map<string, Consumer>;
}

export interface TransportOptions {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
}

const MEDIASOUP_CONFIG: MediasoupConfig = {
  numWorkers: parseInt(process.env.MEDIASOUP_WORKERS || '2', 10),
  announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
  rtcMinPort: parseInt(process.env.MEDIASOUP_RTC_MIN_PORT || '40000', 10),
  rtcMaxPort: parseInt(process.env.MEDIASOUP_RTC_MAX_PORT || '49999', 10),
};

// Media codecs configuration (using plain object to avoid strict typing issues)
const MEDIA_CODECS = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: {
      useinbandfec: 1,
      usedtx: 1,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id': 2,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
    },
  },
] as mediasoup.types.RtpCodecCapability[];

class MediasoupService {
  private workers: Worker[] = [];
  private nextWorkerIndex = 0;
  private rooms: Map<string, VoiceRoom> = new Map();
  private initialized = false;

  /**
   * Initialize mediasoup workers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Mediasoup already initialized');
      return;
    }

    logger.info({
      numWorkers: MEDIASOUP_CONFIG.numWorkers,
      rtcMinPort: MEDIASOUP_CONFIG.rtcMinPort,
      rtcMaxPort: MEDIASOUP_CONFIG.rtcMaxPort,
    }, 'Initializing Mediasoup workers...');

    for (let i = 0; i < MEDIASOUP_CONFIG.numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
        rtcMinPort: MEDIASOUP_CONFIG.rtcMinPort,
        rtcMaxPort: MEDIASOUP_CONFIG.rtcMaxPort,
      });

      worker.on('died', () => {
        logger.error({ workerPid: worker.pid }, 'Mediasoup worker died');
        // TODO: Handle worker restart
      });

      this.workers.push(worker);
      logger.info({ workerPid: worker.pid }, 'Mediasoup worker created');
    }

    this.initialized = true;
    logger.info('Mediasoup service initialized');
  }

  /**
   * Get next worker (round-robin)
   */
  private getNextWorker(): Worker {
    if (this.workers.length === 0) {
      throw new Error('No mediasoup workers available');
    }
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker!;
  }

  /**
   * Get or create a voice room for a channel
   */
  async getOrCreateRoom(channelId: string): Promise<VoiceRoom> {
    let room = this.rooms.get(channelId);

    if (!room) {
      const worker = this.getNextWorker();
      const router = await worker.createRouter({
        mediaCodecs: MEDIA_CODECS,
      });

      room = {
        router,
        channelId,
        participants: new Map(),
      };

      this.rooms.set(channelId, room);
      logger.info({ channelId }, 'Created voice room');
    }

    return room;
  }

  /**
   * Get room by channel ID
   */
  getRoom(channelId: string): VoiceRoom | undefined {
    return this.rooms.get(channelId);
  }

  /**
   * Close a voice room
   */
  async closeRoom(channelId: string): Promise<void> {
    const room = this.rooms.get(channelId);
    if (!room) return;

    // Close all transports
    for (const participant of room.participants.values()) {
      participant.sendTransport?.close();
      participant.recvTransport?.close();
    }

    // Close router
    room.router.close();

    this.rooms.delete(channelId);
    logger.info({ channelId }, 'Closed voice room');
  }

  /**
   * Get router RTP capabilities
   */
  async getRouterRtpCapabilities(channelId: string): Promise<RtpCapabilities> {
    const room = await this.getOrCreateRoom(channelId);
    return room.router.rtpCapabilities;
  }

  /**
   * Add participant to room
   */
  addParticipant(channelId: string, userId: string, sessionId: string): Participant {
    const room = this.rooms.get(channelId);
    if (!room) {
      throw new Error('Room not found');
    }

    const participant: Participant = {
      userId,
      sessionId,
      consumers: new Map(),
    };

    room.participants.set(sessionId, participant);
    logger.info({ channelId, userId, sessionId }, 'Participant added to room');

    return participant;
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(channelId: string, sessionId: string): Promise<void> {
    const room = this.rooms.get(channelId);
    if (!room) return;

    const participant = room.participants.get(sessionId);
    if (!participant) return;

    // Close all transports
    participant.sendTransport?.close();
    participant.recvTransport?.close();

    room.participants.delete(sessionId);
    logger.info({ channelId, sessionId }, 'Participant removed from room');

    // Close room if empty
    if (room.participants.size === 0) {
      await this.closeRoom(channelId);
    }
  }

  /**
   * Get participant
   */
  getParticipant(channelId: string, sessionId: string): Participant | undefined {
    const room = this.rooms.get(channelId);
    if (!room) return undefined;
    return room.participants.get(sessionId);
  }

  /**
   * Create WebRTC transport (for sending or receiving)
   */
  async createTransport(channelId: string, sessionId: string, direction: 'send' | 'recv'): Promise<TransportOptions> {
    const room = await this.getOrCreateRoom(channelId);
    const participant = room.participants.get(sessionId);

    if (!participant) {
      throw new Error('Participant not found');
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: MEDIASOUP_CONFIG.announcedIp || undefined,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    if (direction === 'send') {
      participant.sendTransport = transport;
    } else {
      participant.recvTransport = transport;
    }

    logger.info({ channelId, sessionId, direction, transportId: transport.id }, 'Transport created');

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  /**
   * Connect transport
   */
  async connectTransport(
    channelId: string,
    sessionId: string,
    transportId: string,
    dtlsParameters: any
  ): Promise<void> {
    const room = this.rooms.get(channelId);
    if (!room) throw new Error('Room not found');

    const participant = room.participants.get(sessionId);
    if (!participant) throw new Error('Participant not found');

    const transport = participant.sendTransport?.id === transportId
      ? participant.sendTransport
      : participant.recvTransport;

    if (!transport) throw new Error('Transport not found');

    await transport.connect({ dtlsParameters });
    logger.info({ channelId, sessionId, transportId }, 'Transport connected');
  }

  /**
   * Produce media
   */
  async produce(
    channelId: string,
    sessionId: string,
    kind: 'audio' | 'video',
    rtpParameters: any,
    appData?: any
  ): Promise<{ producerId: string }> {
    const room = this.rooms.get(channelId);
    if (!room) throw new Error('Room not found');

    const participant = room.participants.get(sessionId);
    if (!participant || !participant.sendTransport) {
      throw new Error('Participant or send transport not found');
    }

    const producer = await participant.sendTransport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, sessionId, userId: participant.userId },
    });

    if (kind === 'audio') {
      participant.audioProducer = producer;
    } else if (appData?.type === 'screen') {
      participant.screenProducer = producer;
    } else {
      participant.videoProducer = producer;
    }

    // Notify other participants to consume
    this.broadcastNewProducer(room, sessionId, producer.id, kind, appData);

    logger.info({ channelId, sessionId, kind, producerId: producer.id }, 'Producer created');

    return { producerId: producer.id };
  }

  /**
   * Consume media from another participant
   */
  async consume(
    channelId: string,
    sessionId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<{
    consumerId: string;
    producerId: string;
    kind: 'audio' | 'video';
    rtpParameters: any;
  }> {
    const room = this.rooms.get(channelId);
    if (!room) throw new Error('Room not found');

    const participant = room.participants.get(sessionId);
    if (!participant || !participant.recvTransport) {
      throw new Error('Participant or receive transport not found');
    }

    // Find producer
    let producer: Producer | undefined;
    for (const p of room.participants.values()) {
      if (p.audioProducer?.id === producerId) producer = p.audioProducer;
      else if (p.videoProducer?.id === producerId) producer = p.videoProducer;
      else if (p.screenProducer?.id === producerId) producer = p.screenProducer;
    }

    if (!producer) throw new Error('Producer not found');

    // Can consume?
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume');
    }

    const consumer = await participant.recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
      appData: { ...producer.appData },
    });

    participant.consumers.set(consumer.id, consumer);

    logger.info({ channelId, sessionId, consumerId: consumer.id, producerId }, 'Consumer created');

    return {
      consumerId: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  /**
   * Resume consumer
   */
  async resumeConsumer(channelId: string, sessionId: string, consumerId: string): Promise<void> {
    const room = this.rooms.get(channelId);
    if (!room) throw new Error('Room not found');

    const participant = room.participants.get(sessionId);
    if (!participant) throw new Error('Participant not found');

    const consumer = participant.consumers.get(consumerId);
    if (!consumer) throw new Error('Consumer not found');

    await consumer.resume();
  }

  /**
   * Close producer
   */
  async closeProducer(channelId: string, sessionId: string, producerId: string): Promise<void> {
    const room = this.rooms.get(channelId);
    if (!room) return;

    const participant = room.participants.get(sessionId);
    if (!participant) return;

    if (participant.audioProducer?.id === producerId) {
      participant.audioProducer.close();
      participant.audioProducer = undefined;
    } else if (participant.videoProducer?.id === producerId) {
      participant.videoProducer.close();
      participant.videoProducer = undefined;
    } else if (participant.screenProducer?.id === producerId) {
      participant.screenProducer.close();
      participant.screenProducer = undefined;
    }

    logger.info({ channelId, sessionId, producerId }, 'Producer closed');
  }

  /**
   * Close consumer
   */
  async closeConsumer(channelId: string, sessionId: string, consumerId: string): Promise<void> {
    const room = this.rooms.get(channelId);
    if (!room) return;

    const participant = room.participants.get(sessionId);
    if (!participant) return;

    const consumer = participant.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      participant.consumers.delete(consumerId);
    }
  }

  /**
   * Get all producers in a room (for new participants to consume)
   */
  getRoomProducers(channelId: string): Array<{ producerId: string; kind: 'audio' | 'video'; sessionId: string; appData: any }> {
    const room = this.rooms.get(channelId);
    if (!room) return [];

    const producers: Array<{ producerId: string; kind: 'audio' | 'video'; sessionId: string; appData: any }> = [];

    for (const [sessionId, participant] of room.participants) {
      if (participant.audioProducer) {
        producers.push({
          producerId: participant.audioProducer.id,
          kind: 'audio',
          sessionId,
          appData: participant.audioProducer.appData,
        });
      }
      if (participant.videoProducer) {
        producers.push({
          producerId: participant.videoProducer.id,
          kind: 'video',
          sessionId,
          appData: participant.videoProducer.appData,
        });
      }
      if (participant.screenProducer) {
        producers.push({
          producerId: participant.screenProducer.id,
          kind: 'video',
          sessionId,
          appData: { ...participant.screenProducer.appData, type: 'screen' },
        });
      }
    }

    return producers;
  }

  /**
   * Broadcast new producer to other participants
   */
  private broadcastNewProducer(
    _room: VoiceRoom,
    _sessionId: string,
    _producerId: string,
    _kind: 'audio' | 'video',
    _appData?: any
  ): void {
    // This will be handled by the signaling handler
    // For now, participants request producers when they join
  }

  /**
   * Get room stats
   */
  getRoomStats(): { rooms: number; participants: number } {
    let participants = 0;
    for (const room of this.rooms.values()) {
      participants += room.participants.size;
    }
    return { rooms: this.rooms.size, participants };
  }

  /**
   * Close all rooms and cleanup
   */
  async close(): Promise<void> {
    for (const channelId of this.rooms.keys()) {
      await this.closeRoom(channelId);
    }

    for (const worker of this.workers) {
      worker.close();
    }

    this.workers = [];
    this.initialized = false;
    logger.info('Mediasoup service closed');
  }
}

export const mediasoupService = new MediasoupService();
