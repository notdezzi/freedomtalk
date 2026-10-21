/**
 * Cross-node event bus (Redis pub/sub).
 *
 * The Socket.io Redis adapter already fans out room broadcasts across
 * API nodes, but presence and typing managers emit through the local
 * `io` instance only, so events stop at the node that received them.
 * This bus carries those events over Redis pub/sub so every node's
 * subscribers re-emit them to their locally connected clients.
 *
 * Delivery is fire-and-forget: a Redis outage degrades to the previous
 * node-local behavior (local emit still happens) instead of failing.
 * Each payload carries the emitting NODE_ID; nodes skip their own
 * messages because the manager already emitted locally.
 */

import { RedisClientType } from 'redis';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@freedomtalk/shared';
import { wsServer } from './websocket.server';

export const PRESENCE_CHANNEL = 'crossnode:presence';
export const TYPING_CHANNEL = 'crossnode:typing';

/** Stable per-process identity; NODE_ID env lets deployments pin it */
export const NODE_ID = process.env.NODE_ID || `node-${process.pid}`;

export interface PresenceBroadcast {
  nodeId: string;
  userId: string;
  presence: 'online' | 'offline';
  timestamp: string;
  dmChannelIds: string[];
  friendIds: string[];
}

export interface TypingBroadcast {
  nodeId: string;
  kind: 'start' | 'stop';
  userId: string;
  username: string;
  channelId: string;
  channelType: 'channel' | 'dm';
  timestamp: string;
}

let subscriber: RedisClientType | null = null;
let starting: Promise<void> | null = null;

/** Get the local Socket.io instance; returns null before server init */
function getIO() {
  try {
    return wsServer.getIO();
  } catch {
    return null;
  }
}

function onPresenceMessage(raw: string): void {
  try {
    const p = JSON.parse(raw) as PresenceBroadcast;
    if (p.nodeId === NODE_ID) return;
    const io = getIO();
    if (!io) return;

    const timestamp = p.timestamp;
    for (const dmChannelId of p.dmChannelIds) {
      io.to(`dm:${dmChannelId}`).emit(WS_EVENTS.PRESENCE_UPDATE, {
        userId: p.userId,
        presence: p.presence,
        dmChannelId,
        timestamp,
      });
    }
    for (const friendId of p.friendIds) {
      io.to(`user:${friendId}`).emit(WS_EVENTS.FRIEND_PRESENCE_UPDATE, {
        userId: p.userId,
        presence: p.presence,
        timestamp,
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error handling cross-node presence message');
  }
}

function onTypingMessage(raw: string): void {
  try {
    const p = JSON.parse(raw) as TypingBroadcast;
    if (p.nodeId === NODE_ID) return;
    const io = getIO();
    if (!io) return;

    const roomName = p.channelType === 'dm' ? `dm:${p.channelId}` : `channel:${p.channelId}`;
    const event = p.kind === 'start' ? WS_EVENTS.TYPING_START : WS_EVENTS.TYPING_STOP;
    const payload =
      p.channelType === 'dm'
        ? { userId: p.userId, username: p.username, dmChannelId: p.channelId, timestamp: p.timestamp }
        : { userId: p.userId, username: p.username, channelId: p.channelId, timestamp: p.timestamp };
    io.to(roomName).emit(event, payload);
  } catch (error) {
    logger.error({ error }, 'Error handling cross-node typing message');
  }
}

/**
 * Subscribe to the cross-node channels. Idempotent; safe to call at
 * server boot and awaited by standalone node launchers.
 */
export function startCrossNodeBus(): Promise<void> {
  if (subscriber) return Promise.resolve();
  if (starting) return starting;

  starting = (async () => {
    try {
      const redis = await getRedisClient();
      const sub = redis.duplicate() as RedisClientType;
      await sub.connect();
      await sub.subscribe(PRESENCE_CHANNEL, onPresenceMessage);
      await sub.subscribe(TYPING_CHANNEL, onTypingMessage);
      subscriber = sub;
      logger.info({ nodeId: NODE_ID }, 'Cross-node bus subscribed');
    } catch (error) {
      logger.warn({ error }, 'Cross-node bus unavailable; events stay node-local until it connects');
    } finally {
      starting = null;
    }
  })();

  return starting;
}

/** Publish to a cross-node channel; never throws */
export async function publishCrossNode(
  channel: string,
  payload: Omit<PresenceBroadcast, 'nodeId'> | Omit<TypingBroadcast, 'nodeId'>
): Promise<void> {
  try {
    // Kick off subscription lazily too (e.g. first publish after boot)
    void startCrossNodeBus();
    const redis = await getRedisClient();
    await redis.publish(channel, JSON.stringify({ ...payload, nodeId: NODE_ID }));
  } catch (error) {
    logger.warn({ error, channel }, 'Failed to publish cross-node event');
  }
}

/** Close the subscriber connection (server shutdown) */
export async function stopCrossNodeBus(): Promise<void> {
  if (!subscriber) return;
  try {
    await subscriber.quit();
  } catch {
    // already closed
  }
  subscriber = null;
}
