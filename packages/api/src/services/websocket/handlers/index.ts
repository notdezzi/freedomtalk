import { Server as SocketIOServer, Socket } from 'socket.io';
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
import { voiceHandler } from './voice.handler';
import {
  enforceRateLimit,
  tryAcquireInFlight,
  releaseInFlight,
  resetRateLimitState,
  MAX_IN_FLIGHT_MESSAGE_CREATE,
} from '../rate-limiter';

/**
 * Register a rate-limited event handler on a socket.
 *
 * Checks the per-connection, per-event token bucket before dispatching. On
 * violation, the client receives an `error` event with the same
 * { code, message } convention used by the other handlers, plus the event
 * name and retryAfterMs — nothing else is emitted.
 *
 * All handler arguments are forwarded (payload plus any acknowledgment
 * callback) so request/ack style events keep working under rate limiting.
 *
 * For message:create, also enforces ingestion backpressure: a socket may
 * only have MAX_IN_FLIGHT_MESSAGE_CREATE dispatched-but-unacknowledged
 * messages; the slot is released when the handler completes (the
 * 'message:ack' or an error has been emitted by then).
 *
 * @param socket - Socket instance
 * @param event - WebSocket event name
 * @param handler - Event handler to invoke when allowed
 * @param options - trackInFlight: apply message:create backpressure
 */
function onRateLimitedEvent(
  socket: Socket,
  event: string,
  handler: (...args: unknown[]) => void | Promise<void>,
  options: { trackInFlight?: boolean } = {}
): void {
  socket.on(event, async (...args: unknown[]) => {
    const limit = enforceRateLimit(socket, event);
    if (!limit.allowed) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please slow down',
        event,
        retryAfterMs: limit.retryAfterMs,
      });
      return;
    }

    if (options.trackInFlight && !tryAcquireInFlight(socket.id)) {
      socket.emit(WS_EVENTS.ERROR, {
        code: 'RATE_LIMITED',
        message: `Too many unacknowledged messages (max ${MAX_IN_FLIGHT_MESSAGE_CREATE} in flight)`,
        event,
        retryAfterMs: 0, // Retry as soon as an ack arrives
      });
      return;
    }

    try {
      await handler(...args);
    } finally {
      if (options.trackInFlight) {
        releaseInFlight(socket.id);
      }
    }
  });
}

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
    // Drop rate limiter / backpressure state for this socket on disconnect
    socket.on(WS_EVENTS.DISCONNECT, () => resetRateLimitState(socket.id));
    socket.on(WS_EVENTS.PING, () => handlePing(socket));
    socket.on(WS_EVENTS.PONG, () => handlePong(socket));

    // Room management events
    onRateLimitedEvent(socket, WS_EVENTS.ROOM_JOIN, (data) => handleRoomJoin(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.ROOM_LEAVE, (data) => handleRoomLeave(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.SUBSCRIPTION_SYNC, () => handleSubscriptionSync(socket));

    // Presence events
    onRateLimitedEvent(socket, WS_EVENTS.PRESENCE_UPDATE, () => handlePresenceUpdate(socket));
    onRateLimitedEvent(socket, WS_EVENTS.STATUS_CHANGE, (data) => handleStatusChange(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.TYPING_START, (data) => handleTypingStart(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.TYPING_STOP, (data) => handleTypingStop(socket, data));

    // Message events (message:create additionally tracks in-flight messages)
    onRateLimitedEvent(socket, WS_EVENTS.MESSAGE_CREATE, (data) => handleMessageCreate(socket, data), { trackInFlight: true });
    onRateLimitedEvent(socket, WS_EVENTS.MESSAGE_UPDATE, (data) => handleMessageUpdate(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.MESSAGE_DELETE, (data) => handleMessageDelete(socket, data));

    // Reaction events
    onRateLimitedEvent(socket, WS_EVENTS.REACTION_ADD, (data) => handleReactionAdd(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.REACTION_REMOVE, (data) => handleReactionRemove(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.REACTION_REMOVE_ALL, (data) => handleReactionRemoveAll(socket, data));
    onRateLimitedEvent(socket, WS_EVENTS.REACTION_REMOVE_EMOJI, (data) => handleReactionRemoveEmoji(socket, data));

    // DM Channel events (rate limited like the other events)
    registerDMChannelHandlers(socket, (event, handler) =>
      onRateLimitedEvent(socket, event, handler)
    );

    // Voice events (WebRTC signaling, rate limited like the other events)
    voiceHandler.registerHandlers(socket, (event, handler) =>
      onRateLimitedEvent(socket, event, handler)
    );
  });

  logger.info('WebSocket event handlers registered');
}

