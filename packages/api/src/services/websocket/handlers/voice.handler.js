import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../../../config/redis';
import { logger } from '../../../config/logger';
import { voiceStateService } from '../../voice/voice-state.service';
import { channelService } from '../../channel/channel.service';
const REDIS_CHANNEL_REQUESTS = 'voice:signaling:request';
const socketSessions = new Map();
class VoiceHandler {
    pendingRequests = new Map();
    initialized = false;
    async initialize() {
        if (this.initialized)
            return;
        redisClient.on('message', this.handleResponse.bind(this));
        this.initialized = true;
        logger.info('Voice WebSocket handler initialized');
    }
    handleResponse(_channel, message) {
        try {
            const response = JSON.parse(message);
            const pending = this.pendingRequests.get(response.requestId);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(response.requestId);
                if (response.success) {
                    pending.resolve(response.data);
                }
                else {
                    pending.reject(new Error(response.error));
                }
            }
        }
        catch (error) {
            logger.error({ error }, 'Error handling voice response');
        }
    }
    async sendRequest(type, channelId, sessionId, data) {
        const requestId = uuidv4();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('Request timeout'));
            }, 10000);
            this.pendingRequests.set(requestId, { resolve, reject, timeout });
            const message = JSON.stringify({
                type,
                channelId,
                sessionId,
                requestId,
                data,
            });
            redisClient.publish(REDIS_CHANNEL_REQUESTS, message);
        });
    }
    registerHandlers(socket) {
        const userId = socket.user?.userId;
        if (!userId)
            return;
        socket.on('voice:join', async (data, callback) => {
            try {
                const { channelId } = data;
                const channel = await channelService.getChannel(channelId);
                if (!channel || channel.type !== 'voice') {
                    return callback?.({ success: false, error: 'Invalid voice channel' });
                }
                const sessionId = uuidv4();
                await voiceStateService.createVoiceState({
                    channelId,
                    userId,
                    serverId: channel.server_id,
                    sessionId,
                });
                socketSessions.set(socket.id, { sessionId, channelId, userId });
                socket.join(`voice:${channelId}`);
                const result = await this.sendRequest('join_room', channelId, sessionId, { userId });
                const { rtpCapabilities } = await this.sendRequest('get_router_rtp_capabilities', channelId, sessionId);
                socket.to(`voice:${channelId}`).emit('voice:user_joined', {
                    userId,
                    sessionId,
                });
                callback?.({
                    success: true,
                    data: {
                        sessionId,
                        rtpCapabilities,
                        producers: result?.producers || [],
                    },
                });
                logger.info({ channelId, userId, sessionId }, 'User joined voice channel');
            }
            catch (error) {
                logger.error({ error }, 'Error joining voice channel');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:leave', async (callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                const { sessionId, channelId } = session;
                await this.sendRequest('leave_room', channelId, sessionId);
                await voiceStateService.deleteVoiceState(sessionId);
                socket.leave(`voice:${channelId}`);
                socket.to(`voice:${channelId}`).emit('voice:user_left', { sessionId });
                socketSessions.delete(socket.id);
                callback?.({ success: true });
                logger.info({ channelId, sessionId }, 'User left voice channel');
            }
            catch (error) {
                logger.error({ error }, 'Error leaving voice channel');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:create_transport', async (data, callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                const transport = await this.sendRequest('create_transport', session.channelId, session.sessionId, { direction: data.direction });
                callback?.({ success: true, data: transport });
            }
            catch (error) {
                logger.error({ error }, 'Error creating transport');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:connect_transport', async (data, callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                await this.sendRequest('connect_transport', session.channelId, session.sessionId, { transportId: data.transportId, dtlsParameters: data.dtlsParameters });
                callback?.({ success: true });
            }
            catch (error) {
                logger.error({ error }, 'Error connecting transport');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:produce', async (data, callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                const result = await this.sendRequest('produce', session.channelId, session.sessionId, { kind: data.kind, rtpParameters: data.rtpParameters, appData: data.appData });
                if (data.kind === 'video') {
                    const isScreen = data.appData?.type === 'screen';
                    await voiceStateService.updateVoiceState(session.sessionId, {
                        selfVideo: !isScreen,
                        selfStream: isScreen,
                    });
                    socket.to(`voice:${session.channelId}`).emit('voice:user_state', {
                        sessionId: session.sessionId,
                        selfVideo: !isScreen,
                        selfStream: isScreen,
                    });
                }
                socket.to(`voice:${session.channelId}`).emit('voice:new_producer', {
                    producerId: result.producerId,
                    kind: data.kind,
                    sessionId: session.sessionId,
                    appData: data.appData,
                });
                callback?.({ success: true, data: result });
            }
            catch (error) {
                logger.error({ error }, 'Error producing');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:consume', async (data, callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                const result = await this.sendRequest('consume', session.channelId, session.sessionId, { producerId: data.producerId, rtpCapabilities: data.rtpCapabilities });
                callback?.({ success: true, data: result });
            }
            catch (error) {
                logger.error({ error }, 'Error consuming');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:resume_consumer', async (data, callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                await this.sendRequest('resume_consumer', session.channelId, session.sessionId, { consumerId: data.consumerId });
                callback?.({ success: true });
            }
            catch (error) {
                logger.error({ error }, 'Error resuming consumer');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:close_producer', async (data, callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                await this.sendRequest('close_producer', session.channelId, session.sessionId, { producerId: data.producerId });
                callback?.({ success: true });
            }
            catch (error) {
                logger.error({ error }, 'Error closing producer');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:state_update', async (data, callback) => {
            try {
                const session = socketSessions.get(socket.id);
                if (!session) {
                    return callback?.({ success: false, error: 'Not in a voice channel' });
                }
                const updated = await voiceStateService.updateVoiceState(session.sessionId, data);
                socket.to(`voice:${session.channelId}`).emit('voice:user_state', {
                    sessionId: session.sessionId,
                    ...data,
                });
                callback?.({ success: true, data: updated });
            }
            catch (error) {
                logger.error({ error }, 'Error updating voice state');
                callback?.({ success: false, error: error.message });
            }
        });
        socket.on('voice:speaking', async (data) => {
            const session = socketSessions.get(socket.id);
            if (!session)
                return;
            socket.to(`voice:${session.channelId}`).emit('voice:user_speaking', {
                sessionId: session.sessionId,
                speaking: data.speaking,
            });
        });
        socket.on('disconnect', async () => {
            const session = socketSessions.get(socket.id);
            if (session) {
                try {
                    await this.sendRequest('leave_room', session.channelId, session.sessionId);
                    await voiceStateService.deleteVoiceState(session.sessionId);
                    socket.to(`voice:${session.channelId}`).emit('voice:user_left', { sessionId: session.sessionId });
                }
                catch (error) {
                    logger.error({ error }, 'Error cleaning up voice session on disconnect');
                }
                socketSessions.delete(socket.id);
            }
        });
    }
    async close() {
        this.initialized = false;
        logger.info('Voice WebSocket handler closed');
    }
}
export const voiceHandler = new VoiceHandler();
//# sourceMappingURL=voice.handler.js.map