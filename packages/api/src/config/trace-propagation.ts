/**
 * Trace context propagation over RabbitMQ.
 *
 * The API publishes domain events and workers consume them in different
 * processes; W3C TraceContext headers carried on the AMQP message make
 * both sides part of one trace. `publishEvent` injects the active span
 * context into the publish headers and `consumeEvents` extracts it so
 * handler work (and any spans it creates) parents to the original
 * request trace. No-op when OpenTelemetry is disabled (OTEL_ENABLED).
 */

import { context, propagation } from '@opentelemetry/api';

/** Serialize the active span context into AMQP publish headers */
export function injectTraceHeaders(base: Record<string, string> = {}): Record<string, string> {
  const carrier: Record<string, string> = { ...base };
  propagation.inject(context.active(), carrier);
  return carrier;
}

/**
 * Run `fn` inside the context extracted from AMQP message headers so
 * spans created by the consumer parent to the producer's trace.
 */
export function withTraceContext<T>(
  headers: Record<string, unknown> | undefined,
  fn: () => T
): T {
  const ctx = propagation.extract(context.active(), headers ?? {});
  return context.with(ctx, fn);
}
