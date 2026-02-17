import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { mediasoupService } from './mediasoup.service';
const REDIS_CHANNEL_REQUESTS = 'voice:signaling:request';
const REDIS_CHANNEL_RESPONSES = 'voice:signaling:response';
class SignalingHandler {
    initialized = false;
    async initialize() {
        if (this.initialized)
            return;
        await redisClient.subscribe(REDIS_CHANNEL_REQUESTS, (message, _channel) => {
            this.handleMessage(message);
        });
        this.initialized = true;
        logger.info('Voice signaling handler initialized');
    }
    async handleMessage(message) {
        try {
            const msg = JSON.parse(message);
            logger.debug({ type: msg.type, channelId: msg.channelId }, 'Received signaling message');
            let response;
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
            await redisClient.publish(REDIS_CHANNEL_RESPONSES, JSON.stringify(response));
        }
        catch (error) {
            logger.error({ error }, 'Error handling signaling message');
        }
    }
    async handleGetRouterRtpCapabilities(msg) {
        try {
            const rtpCapabilities = await mediasoupService.getRouterRtpCapabilities(msg.channelId);
            return {
                requestId: msg.requestId || '',
                success: true,
                data: { rtpCapabilities },
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleCreateTransport(msg) {
        try {
            const { direction } = msg.data || {};
            const transport = await mediasoupService.createTransport(msg.channelId, msg.sessionId, direction);
            return {
                requestId: msg.requestId || '',
                success: true,
                data: { transport },
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleConnectTransport(msg) {
        try {
            const { transportId, dtlsParameters } = msg.data || {};
            await mediasoupService.connectTransport(msg.channelId, msg.sessionId, transportId, dtlsParameters);
            return {
                requestId: msg.requestId || '',
                success: true,
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleProduce(msg) {
        try {
            const { kind, rtpParameters, appData } = msg.data || {};
            const result = await mediasoupService.produce(msg.channelId, msg.sessionId, kind, rtpParameters, appData);
            return {
                requestId: msg.requestId || '',
                success: true,
                data: result,
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleConsume(msg) {
        try {
            const { producerId, rtpCapabilities } = msg.data || {};
            const result = await mediasoupService.consume(msg.channelId, msg.sessionId, producerId, rtpCapabilities);
            return {
                requestId: msg.requestId || '',
                success: true,
                data: result,
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleResumeConsumer(msg) {
        try {
            const { consumerId } = msg.data || {};
            await mediasoupService.resumeConsumer(msg.channelId, msg.sessionId, consumerId);
            return {
                requestId: msg.requestId || '',
                success: true,
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleCloseProducer(msg) {
        try {
            const { producerId } = msg.data || {};
            await mediasoupService.closeProducer(msg.channelId, msg.sessionId, producerId);
            return {
                requestId: msg.requestId || '',
                success: true,
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleCloseConsumer(msg) {
        try {
            const { consumerId } = msg.data || {};
            await mediasoupService.closeConsumer(msg.channelId, msg.sessionId, consumerId);
            return {
                requestId: msg.requestId || '',
                success: true,
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleJoinRoom(msg) {
        try {
            await mediasoupService.getOrCreateRoom(msg.channelId);
            mediasoupService.addParticipant(msg.channelId, msg.userId, msg.sessionId);
            const producers = mediasoupService.getRoomProducers(msg.channelId);
            return {
                requestId: msg.requestId || '',
                success: true,
                data: { producers },
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleLeaveRoom(msg) {
        try {
            await mediasoupService.removeParticipant(msg.channelId, msg.sessionId);
            return {
                requestId: msg.requestId || '',
                success: true,
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async handleGetProducers(msg) {
        try {
            const producers = mediasoupService.getRoomProducers(msg.channelId);
            return {
                requestId: msg.requestId || '',
                success: true,
                data: { producers },
            };
        }
        catch (error) {
            return {
                requestId: msg.requestId || '',
                success: false,
                error: error.message,
            };
        }
    }
    async close() {
        await redisClient.unsubscribe();
        this.initialized = false;
        logger.info('Voice signaling handler closed');
    }
}
export const signalingHandler = new SignalingHandler();
//# sourceMappingURL=signaling.handler.js.map