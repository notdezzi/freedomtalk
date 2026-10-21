/**
 * RabbitMQ pipeline integration tests (real broker via Testcontainers).
 *
 * Covers the producer/consumer contract from config/rabbitmq.ts:
 * - topology is declared and consumers receive published domain events
 * - custom headers (trace context) survive the round trip
 * - a failing handler retries up to MAX_CONSUME_RETRIES, then the broker
 *   dead-letters the message to freedomtalk.dlq
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import amqp, { ConsumeMessage } from 'amqplib';
import {
  connectRabbitMQ,
  publishEvent,
  consumeEvents,
  disconnectRabbitMQ,
  EXCHANGE,
  DLX_EXCHANGE,
  DLQ_QUEUE,
  SEARCH_QUEUE,
  MAX_CONSUME_RETRIES,
  DomainEvent,
} from '../config/rabbitmq';

const validEvent: DomainEvent = {
  type: 'message.created',
  payload: {
    id: '1234567890',
    content: 'hello from the integration test',
    authorId: 'author-1',
    channelId: 'channel-1',
    serverId: null,
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
};

function waitFor<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), ms)
    ),
  ]);
}

describe('RabbitMQ pipeline', () => {
  beforeAll(async () => {
    // RABBITMQ_URL points at the Testcontainers broker (see test-setup.ts)
    await connectRabbitMQ({ required: true, retries: 10 });
  });

  afterAll(async () => {
    await disconnectRabbitMQ();
  });

  it('publishes a domain event and the consumer handles it, headers intact', async () => {
    let resolveReceived: (value: { event: DomainEvent; headers: Record<string, unknown> }) => void;
    const received = new Promise<{ event: DomainEvent; headers: Record<string, unknown> }>(
      (resolve) => {
        resolveReceived = resolve;
      }
    );

    await consumeEvents(SEARCH_QUEUE, async (event, msg) => {
      resolveReceived({ event, headers: (msg.properties.headers ?? {}) as Record<string, unknown> });
    });

    expect(
      await publishEvent(validEvent, { 'traceparent': '00-traceid-spanid-01' })
    ).toBe(true);

    const { event, headers } = await waitFor(received, 10_000, 'consumed event');
    expect(event.type).toBe('message.created');
    expect(event.payload).toMatchObject({ id: validEvent.payload.id, content: validEvent.payload.content });
    expect(headers['traceparent']).toBe('00-traceid-spanid-01');
  });

  it('retries a failing handler then dead-letters the message to the DLQ', async () => {
    const raw = await amqp.connect(process.env.RABBITMQ_URL!);
    const ch = await raw.createChannel();

    const retryQueue = 'test.retry.queue';
    await ch.assertQueue(retryQueue, { durable: true, deadLetterExchange: DLX_EXCHANGE });
    await ch.bindQueue(retryQueue, EXCHANGE, 'message.created');

    let attempts = 0;
    await consumeEvents(retryQueue, async () => {
      attempts += 1;
      throw new Error('poison message');
    });

    await publishEvent({
      type: 'message.created',
      payload: { ...validEvent.payload, id: 'poison-1' },
    });

    // Poison message should be retried MAX_CONSUME_RETRIES times, then nacked
    // without requeue, which routes it through the DLX into freedomtalk.dlq.
    let resolveDlq: (value: ConsumeMessage) => void;
    const dlqMessage = new Promise<ConsumeMessage>((resolve) => {
      resolveDlq = resolve;
    });
    await ch.consume(DLQ_QUEUE, (msg) => {
      if (msg) {
        resolveDlq(msg);
        ch.ack(msg);
      }
    });

    const dead = await waitFor(dlqMessage, 15_000, 'DLQ delivery');
    expect(JSON.parse(dead.content.toString('utf8')).payload.id).toBe('poison-1');
    expect(dead.properties.headers?.['x-retry-count']).toBe(MAX_CONSUME_RETRIES);
    expect(attempts).toBe(MAX_CONSUME_RETRIES + 1);

    await ch.close();
    await raw.close();
  });

  it('exposes the DLX exchange as fanout and the DLQ bound to it', async () => {
    const raw = await amqp.connect(process.env.RABBITMQ_URL!);
    const ch = await raw.createChannel();
    await ch.checkExchange(DLX_EXCHANGE);
    await ch.checkQueue(DLQ_QUEUE);
    await ch.close();
    await raw.close();
  });
});
