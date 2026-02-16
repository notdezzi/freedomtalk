import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { authenticateSocket } from '../auth.middleware';
import {
  handleConnection,
  handleDisconnect,
  handlePing,
  handlePong,
} from './connection.handler';
import {
  handleRoomJoin,
  handleRoomLeave,
  handleSubscriptionSync,
} from './room.handler';
import {
  handlePresenceUpdate,
  handleStatusChange,
  handleTypingStart,
  handleTypingStop,
} from './presence.handler';
import {
  handleMessageCreate,
  handleMessageUpdate,
  handleMessageDelete,
} from './message.handler';
import {
  handleReactionAdd,
  handleReactionRemove,
  handleReactionRemoveAll,
  handleReactionRemoveEmoji,
} from './reaction.handler';
import { registerDMChannelHandlers } from './dm.handler';

/**
 * Register all WebSocket event handlers
 * @param io - Socket.io server instance
 */
export function registerHandlers(io: SocketIOServer): void {
  // Register authentication middleware
  io.use(authenticateSocket);

  // Register connection event handler
  io.on(WS_EVENTS.CONNECT, (socket) => {
    // Handle connection
    handleConnection(socket);

    // Register socket-level event handlers
    socket.on(WS_EVENTS.DISCONNECT, () => handleDisconnect(socket));
    socket.on(WS_EVENTS.PING, () => handlePing(socket));
    socket.on(WS_EVENTS.PONG, () => handlePong(socket));

    // Room management events
    socket.on(WS_EVENTS.ROOM_JOIN, (data) => handleRoomJoin(socket, data));
    socket.on(WS_EVENTS.ROOM_LEAVE, (data) => handleRoomLeave(socket, data));
    socket.on(WS_EVENTS.SUBSCRIPTION_SYNC, () => handleSubscriptionSync(socket));

    // Presence events
    socket.on(WS_EVENTS.PRESENCE_UPDATE, () => handlePresenceUpdate(socket));
    socket.on(WS_EVENTS.STATUS_CHANGE, (data) => handleStatusChange(socket, data));
    socket.on(WS_EVENTS.TYPING_START, (data) => handleTypingStart(socket, data));
    socket.on(WS_EVENTS.TYPING_STOP, (data) => handleTypingStop(socket, data));

    // Message events
    socket.on(WS_EVENTS.MESSAGE_CREATE, (data) => handleMessageCreate(socket, data));
    socket.on(WS_EVENTS.MESSAGE_UPDATE, (data) => handleMessageUpdate(socket, data));
    socket.on(WS_EVENTS.MESSAGE_DELETE, (data) => handleMessageDelete(socket, data));

    // Reaction events
    socket.on(WS_EVENTS.REACTION_ADD, (data) => handleReactionAdd(socket, data));
    socket.on(WS_EVENTS.REACTION_REMOVE, (data) => handleReactionRemove(socket, data));
    socket.on(WS_EVENTS.REACTION_REMOVE_ALL, (data) => handleReactionRemoveAll(socket, data));
    socket.on(WS_EVENTS.REACTION_REMOVE_EMOJI, (data) => handleReactionRemoveEmoji(socket, data));

    // DM Channel events
    registerDMChannelHandlers(socket);
  });

  logger.info('WebSocket event handlers registered');
}

