/**
 * Cross-process WebSocket delivery for workers.
 *
 * Workers run outside the API process, so they cannot touch the live
 * Socket.io server. The Socket.io Redis emitter publishes to the same
 * Redis pub/sub channels the server's adapter subscribes to, which
 * forwards events to connected clients as if they were emitted locally.
 * Room names follow the same `${type}:${id}` convention as RoomManager.
 */

import { Emitter } from '@socket.io/redis-emitter';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

let emitter: Emitter | null = null;

async function getEmitter(): Promise<Emitter | null> {
  if (emitter) return emitter;
  try {
    const redis = await getRedisClient();
    emitter = new Emitter(redis);
    return emitter;
  } catch (error) {
    logger.error({ error }, 'Failed to create Socket.io Redis emitter');
    return null;
  }
}

/**
 * Emit a Socket.io event to a room (e.g. `channel:123`, `user:456`).
 * Never throws: WebSocket delivery is best-effort for side effects.
 */
export async function emitToRoom(
  room: string,
  event: string,
  payload: unknown
): Promise<boolean> {
  const e = await getEmitter();
  if (!e) return false;
  try {
    e.to(room).emit(event, payload);
    return true;
  } catch (error) {
    logger.error({ error, room, event }, 'Failed to emit via Redis emitter');
    return false;
  }
}
