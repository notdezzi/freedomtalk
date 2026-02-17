import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { authenticateSocket } from '../auth.middleware';
import { handleConnection, handleDisconnect, handlePing, handlePong, } from './connection.handler';
import { handleRoomJoin, handleRoomLeave, handleSubscriptionSync, } from './room.handler';
import { handlePresenceUpdate, handleStatusChange, handleTypingStart, handleTypingStop, } from './presence.handler';
import { handleMessageCreate, handleMessageUpdate, handleMessageDelete, } from './message.handler';
import { handleReactionAdd, handleReactionRemove, handleReactionRemoveAll, handleReactionRemoveEmoji, } from './reaction.handler';
import { registerDMChannelHandlers } from './dm.handler';
import { voiceHandler } from './voice.handler';
export function registerHandlers(io) {
    io.use(authenticateSocket);
    io.on(WS_EVENTS.CONNECT, (socket) => {
        handleConnection(socket);
        socket.on(WS_EVENTS.DISCONNECT, () => handleDisconnect(socket));
        socket.on(WS_EVENTS.PING, () => handlePing(socket));
        socket.on(WS_EVENTS.PONG, () => handlePong(socket));
        socket.on(WS_EVENTS.ROOM_JOIN, (data) => handleRoomJoin(socket, data));
        socket.on(WS_EVENTS.ROOM_LEAVE, (data) => handleRoomLeave(socket, data));
        socket.on(WS_EVENTS.SUBSCRIPTION_SYNC, () => handleSubscriptionSync(socket));
        socket.on(WS_EVENTS.PRESENCE_UPDATE, () => handlePresenceUpdate(socket));
        socket.on(WS_EVENTS.STATUS_CHANGE, (data) => handleStatusChange(socket, data));
        socket.on(WS_EVENTS.TYPING_START, (data) => handleTypingStart(socket, data));
        socket.on(WS_EVENTS.TYPING_STOP, (data) => handleTypingStop(socket, data));
        socket.on(WS_EVENTS.MESSAGE_CREATE, (data) => handleMessageCreate(socket, data));
        socket.on(WS_EVENTS.MESSAGE_UPDATE, (data) => handleMessageUpdate(socket, data));
        socket.on(WS_EVENTS.MESSAGE_DELETE, (data) => handleMessageDelete(socket, data));
        socket.on(WS_EVENTS.REACTION_ADD, (data) => handleReactionAdd(socket, data));
        socket.on(WS_EVENTS.REACTION_REMOVE, (data) => handleReactionRemove(socket, data));
        socket.on(WS_EVENTS.REACTION_REMOVE_ALL, (data) => handleReactionRemoveAll(socket, data));
        socket.on(WS_EVENTS.REACTION_REMOVE_EMOJI, (data) => handleReactionRemoveEmoji(socket, data));
        registerDMChannelHandlers(socket);
        voiceHandler.registerHandlers(socket);
    });
    logger.info('WebSocket event handlers registered');
}
//# sourceMappingURL=index.js.map