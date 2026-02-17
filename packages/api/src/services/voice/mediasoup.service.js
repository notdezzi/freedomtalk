import * as mediasoup from 'mediasoup';
import { logger } from '../../config/logger';
const MEDIASOUP_CONFIG = {
    numWorkers: parseInt(process.env.MEDIASOUP_WORKERS || '2', 10),
    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
    rtcMinPort: parseInt(process.env.MEDIASOUP_RTC_MIN_PORT || '40000', 10),
    rtcMaxPort: parseInt(process.env.MEDIASOUP_RTC_MAX_PORT || '49999', 10),
};
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
];
class MediasoupService {
    workers = [];
    nextWorkerIndex = 0;
    rooms = new Map();
    initialized = false;
    async initialize() {
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
            });
            this.workers.push(worker);
            logger.info({ workerPid: worker.pid }, 'Mediasoup worker created');
        }
        this.initialized = true;
        logger.info('Mediasoup service initialized');
    }
    getNextWorker() {
        if (this.workers.length === 0) {
            throw new Error('No mediasoup workers available');
        }
        const worker = this.workers[this.nextWorkerIndex];
        this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
        return worker;
    }
    async getOrCreateRoom(channelId) {
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
    getRoom(channelId) {
        return this.rooms.get(channelId);
    }
    async closeRoom(channelId) {
        const room = this.rooms.get(channelId);
        if (!room)
            return;
        for (const participant of room.participants.values()) {
            participant.sendTransport?.close();
            participant.recvTransport?.close();
        }
        room.router.close();
        this.rooms.delete(channelId);
        logger.info({ channelId }, 'Closed voice room');
    }
    async getRouterRtpCapabilities(channelId) {
        const room = await this.getOrCreateRoom(channelId);
        return room.router.rtpCapabilities;
    }
    addParticipant(channelId, userId, sessionId) {
        const room = this.rooms.get(channelId);
        if (!room) {
            throw new Error('Room not found');
        }
        const participant = {
            userId,
            sessionId,
            consumers: new Map(),
        };
        room.participants.set(sessionId, participant);
        logger.info({ channelId, userId, sessionId }, 'Participant added to room');
        return participant;
    }
    async removeParticipant(channelId, sessionId) {
        const room = this.rooms.get(channelId);
        if (!room)
            return;
        const participant = room.participants.get(sessionId);
        if (!participant)
            return;
        participant.sendTransport?.close();
        participant.recvTransport?.close();
        room.participants.delete(sessionId);
        logger.info({ channelId, sessionId }, 'Participant removed from room');
        if (room.participants.size === 0) {
            await this.closeRoom(channelId);
        }
    }
    getParticipant(channelId, sessionId) {
        const room = this.rooms.get(channelId);
        if (!room)
            return undefined;
        return room.participants.get(sessionId);
    }
    async createTransport(channelId, sessionId, direction) {
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
        }
        else {
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
    async connectTransport(channelId, sessionId, transportId, dtlsParameters) {
        const room = this.rooms.get(channelId);
        if (!room)
            throw new Error('Room not found');
        const participant = room.participants.get(sessionId);
        if (!participant)
            throw new Error('Participant not found');
        const transport = participant.sendTransport?.id === transportId
            ? participant.sendTransport
            : participant.recvTransport;
        if (!transport)
            throw new Error('Transport not found');
        await transport.connect({ dtlsParameters });
        logger.info({ channelId, sessionId, transportId }, 'Transport connected');
    }
    async produce(channelId, sessionId, kind, rtpParameters, appData) {
        const room = this.rooms.get(channelId);
        if (!room)
            throw new Error('Room not found');
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
        }
        else if (appData?.type === 'screen') {
            participant.screenProducer = producer;
        }
        else {
            participant.videoProducer = producer;
        }
        this.broadcastNewProducer(room, sessionId, producer.id, kind, appData);
        logger.info({ channelId, sessionId, kind, producerId: producer.id }, 'Producer created');
        return { producerId: producer.id };
    }
    async consume(channelId, sessionId, producerId, rtpCapabilities) {
        const room = this.rooms.get(channelId);
        if (!room)
            throw new Error('Room not found');
        const participant = room.participants.get(sessionId);
        if (!participant || !participant.recvTransport) {
            throw new Error('Participant or receive transport not found');
        }
        let producer;
        for (const p of room.participants.values()) {
            if (p.audioProducer?.id === producerId)
                producer = p.audioProducer;
            else if (p.videoProducer?.id === producerId)
                producer = p.videoProducer;
            else if (p.screenProducer?.id === producerId)
                producer = p.screenProducer;
        }
        if (!producer)
            throw new Error('Producer not found');
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
    async resumeConsumer(channelId, sessionId, consumerId) {
        const room = this.rooms.get(channelId);
        if (!room)
            throw new Error('Room not found');
        const participant = room.participants.get(sessionId);
        if (!participant)
            throw new Error('Participant not found');
        const consumer = participant.consumers.get(consumerId);
        if (!consumer)
            throw new Error('Consumer not found');
        await consumer.resume();
    }
    async closeProducer(channelId, sessionId, producerId) {
        const room = this.rooms.get(channelId);
        if (!room)
            return;
        const participant = room.participants.get(sessionId);
        if (!participant)
            return;
        if (participant.audioProducer?.id === producerId) {
            participant.audioProducer.close();
            participant.audioProducer = undefined;
        }
        else if (participant.videoProducer?.id === producerId) {
            participant.videoProducer.close();
            participant.videoProducer = undefined;
        }
        else if (participant.screenProducer?.id === producerId) {
            participant.screenProducer.close();
            participant.screenProducer = undefined;
        }
        logger.info({ channelId, sessionId, producerId }, 'Producer closed');
    }
    async closeConsumer(channelId, sessionId, consumerId) {
        const room = this.rooms.get(channelId);
        if (!room)
            return;
        const participant = room.participants.get(sessionId);
        if (!participant)
            return;
        const consumer = participant.consumers.get(consumerId);
        if (consumer) {
            consumer.close();
            participant.consumers.delete(consumerId);
        }
    }
    getRoomProducers(channelId) {
        const room = this.rooms.get(channelId);
        if (!room)
            return [];
        const producers = [];
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
    broadcastNewProducer(_room, _sessionId, _producerId, _kind, _appData) {
    }
    getRoomStats() {
        let participants = 0;
        for (const room of this.rooms.values()) {
            participants += room.participants.size;
        }
        return { rooms: this.rooms.size, participants };
    }
    async close() {
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
//# sourceMappingURL=mediasoup.service.js.map