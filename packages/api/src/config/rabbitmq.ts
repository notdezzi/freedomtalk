/**
 * RabbitMQ Configuration
 *
 * Connection management with reconnect/backoff and a declared topology:
 *
 *   [producers] -> freedomtalk.events (topic exchange)
 *                     |-> search.messages queue  (message indexing worker)
 *                     |-> embeds.generate queue  (link-preview worker)
 *                     `-> ...  (dead-lettered after MAX_CONSUME_RETRIES)
 *                          -> freedomtalk.dlx (fanout) -> freedomtalk.dlq
 *
 * Publishing is fire-and-forget by design: a broker outage must never fail a
 * user request, so publishEvent() drops events (with a warning) while the
 * connection is down.
 */

import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { logger } from './logger';
import { injectTraceHeaders, withTraceContext } from './trace-propagation';
import {
  messageEventsPublished,
  messageEventsConsumed,
  messageConsumeRetries,
  messageDeadLettered,
  messageAckDuration,
} from '../services/monitoring/metrics.service';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:rabbitmq@localhost:5672';

export const EXCHANGE = 'freedomtalk.events';
export const DLX_EXCHANGE = 'freedomtalk.dlx';
export const DLQ_QUEUE = 'freedomtalk.dlq';
export const SEARCH_QUEUE = 'search.messages';
export const EMBED_QUEUE = 'embeds.generate';
export const MENTION_QUEUE = 'notifications.mentions';

/** Consume attempts (via x-death count) before a message is dead-lettered */
export const MAX_CONSUME_RETRIES = 3;

export type DomainEvent =
  | { type: 'message.created'; payload: MessageEventPayload }
  | { type: 'message.updated'; payload: MessageEventPayload }
  | { type: 'message.deleted'; payload: MessageEventPayload };

export interface MessageEventPayload {
  id: string;
  content: string;
  authorId: string;
  channelId: string | null;
  serverId: string | null;
  createdAt: string;
}

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connecting: Promise<void> | null = null;
let closedByUs = false;

/**
 * Connect to RabbitMQ and declare the topology. Idempotent; concurrent
 * callers share one connection attempt. Resolves even if the broker is
 * unreachable after `retries` attempts (publishing degrades gracefully),
 * unless `required` is set (worker startup wants hard failure).
 */
export async function connectRabbitMQ(
  options: { required?: boolean; retries?: number } = {}
): Promise<void> {
  if (channel) return;
  if (connecting) return connecting;

  connecting = (async () => {
    const retries = options.retries ?? 5;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        connection = await amqp.connect(RABBITMQ_URL);
        closedByUs = false;

        connection.on('error', (err) => {
          logger.error({ error: err }, 'RabbitMQ connection error');
        });
        connection.on('close', () => {
          channel = null;
          connection = null;
          if (!closedByUs) {
            logger.warn('RabbitMQ connection closed; scheduling reconnect');
            setTimeout(() => connectRabbitMQ({ required: false, retries: 1 }).catch(() => undefined), backoffMs());
          }
        });

        const ch = await connection.createChannel();
        await declareTopology(ch);
        channel = ch;
        logger.info('RabbitMQ connected and topology declared');
        return;
      } catch (error) {
        logger.error(
          { error, attempt, of: retries },
          'RabbitMQ connection attempt failed'
        );
        if (attempt === retries) {
          if (options.required) {
            throw new Error(`RabbitMQ connection failed after ${retries} attempts: ${error}`);
          }
          logger.error('RabbitMQ unavailable; events will be dropped until reconnect');
          return;
        }
        await sleep(backoffMs(attempt));
      }
    }
  })().finally(() => {
    connecting = null;
  });

  return connecting;
}

function backoffMs(attempt = 1): number {
  return Math.min(attempt * 1000, 10_000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function declareTopology(ch: Channel): Promise<void> {
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertExchange(DLX_EXCHANGE, 'fanout', { durable: true });
  await ch.assertQueue(DLQ_QUEUE, { durable: true });
  await ch.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, '');

  const queueOptions = {
    durable: true,
    deadLetterExchange: DLX_EXCHANGE,
  } as const;

  await ch.assertQueue(SEARCH_QUEUE, queueOptions);
  await ch.bindQueue(SEARCH_QUEUE, EXCHANGE, 'message.created');
  await ch.bindQueue(SEARCH_QUEUE, EXCHANGE, 'message.updated');
  await ch.bindQueue(SEARCH_QUEUE, EXCHANGE, 'message.deleted');

  await ch.assertQueue(EMBED_QUEUE, queueOptions);
  await ch.bindQueue(EMBED_QUEUE, EXCHANGE, 'message.created');

  await ch.assertQueue(MENTION_QUEUE, queueOptions);
  await ch.bindQueue(MENTION_QUEUE, EXCHANGE, 'message.created');

  await ch.prefetch(16);
}

/** Get the shared channel, attempting a lazy reconnect if needed */
export function getRabbitChannel(): Channel | null {
  return channel;
}

/**
 * Publish a domain event. Never throws: returns false if the event could
 * not be buffered (broker down). `headers` can carry trace context.
 */
export async function publishEvent(event: DomainEvent, headers: Record<string, string> = {}): Promise<boolean> {
  if (!channel) {
    logger.warn({ event: event.type }, 'RabbitMQ not connected; dropping event');
    return false;
  }
  try {
    // Carry the active span so the consuming worker joins the same trace
    const headersWithTrace = injectTraceHeaders(headers);
    const ok = channel.publish(EXCHANGE, event.type, Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
      persistent: true,
      headers: headersWithTrace,
    });
    messageEventsPublished.inc({ event_type: event.type, outcome: ok ? 'published' : 'dropped' });
    return ok;
  } catch (error) {
    messageEventsPublished.inc({ event_type: event.type, outcome: 'dropped' });
    logger.error({ error, event: event.type }, 'Failed to publish event');
    return false;
  }
}

/** Extract the broker death count from x-death headers (DLQ inspection) */
export function getDeathCount(msg: ConsumeMessage): number {
  const deaths = msg.properties.headers?.['x-death'];
  if (Array.isArray(deaths) && deaths.length > 0) {
    return Number(deaths[0]?.['count'] ?? 0);
  }
  return 0;
}

export interface ConsumeHandler {
  (event: DomainEvent, msg: ConsumeMessage): Promise<void>;
}

/**
 * Consume events from a queue with ack/retry/dead-letter semantics:
 * - handler success -> ack
 * - handler error -> the message is republished straight back to this
 *   queue with an incremented `x-retry-count` header; once the budget
 *   is spent it is nacked without requeue, so the broker dead-letters
 *   it to freedomtalk.dlq.
 *
 * The retry count must travel with the message: a plain requeue
 * (nack with requeue=true) puts the message back without going through
 * the DLX, so x-death never increments and the message would retry
 * forever. Republishing via the default exchange (empty name) routes to
 * exactly this queue; the topic exchange would re-fanout to every queue.
 */
export async function consumeEvents(queue: string, handler: ConsumeHandler): Promise<void> {
  if (!channel) {
    throw new Error('consumeEvents called before connectRabbitMQ succeeded');
  }
  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    const ackTimer = messageAckDuration.startTimer({ queue });
    try {
      const event = JSON.parse(msg.content.toString('utf8')) as DomainEvent;
      // Parent consumer work to the producer's trace via W3C headers
      await withTraceContext(msg.properties.headers, () => handler(event, msg));
      channel!.ack(msg);
      ackTimer();
      messageEventsConsumed.inc({ queue, event_type: event.type, status: 'success' });
    } catch (error) {
      ackTimer();
      const retries = Number(msg.properties.headers?.['x-retry-count'] ?? 0);
      if (retries >= MAX_CONSUME_RETRIES) {
        logger.error(
          { error, queue, messageId: msg.properties.messageId, retries },
          'Event failed permanently; dead-lettering'
        );
        messageDeadLettered.inc({ queue });
        channel!.nack(msg, false, false);
        return;
      }
      logger.warn(
        { error, queue, messageId: msg.properties.messageId, attempt: retries + 1 },
        'Event handler failed; retrying'
      );
      messageConsumeRetries.inc({ queue });
      channel!.publish('', queue, msg.content, {
        contentType: 'application/json',
        persistent: true,
        headers: { ...msg.properties.headers, 'x-retry-count': retries + 1 },
      });
      channel!.ack(msg);
      messageEventsConsumed.inc({ queue, event_type: 'unknown', status: 'retry' });
    }
  });
}

export async function disconnectRabbitMQ(): Promise<void> {
  closedByUs = true;
  try {
    await channel?.close();
  } catch {
    // already closed
  }
  channel = null;
  try {
    await connection?.close();
  } catch {
    // already closed
  }
  connection = null;
}
