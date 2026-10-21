/**
 * OpenTelemetry Bootstrap
 *
 * Optional distributed tracing for the API. Everything is OFF unless
 * OTEL_ENABLED=true, so local development and tests stay dependency-free.
 *
 * - service.name: 'freedomtalk-api' (override with OTEL_SERVICE_NAME)
 * - OTLP/HTTP exporter: OTEL_EXPORTER_OTLP_ENDPOINT (default http://localhost:4318,
 *   traces are posted to {endpoint}/v1/traces, matching the otel-collector service
 *   in docker-compose.yml)
 * - Auto-instrumentations cover Fastify/HTTP (http instrumentation), pg, redis
 *   (node-redis v4), amqplib and knex out of the box
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const OTEL_ENABLED = process.env.OTEL_ENABLED === 'true';
const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'freedomtalk-api';
const OTEL_EXPORTER_OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

let sdk: NodeSDK | null = null;

/**
 * Whether OpenTelemetry is enabled via environment configuration
 */
export function isOtelEnabled(): boolean {
  return OTEL_ENABLED;
}

/**
 * Start the OpenTelemetry SDK (no-op unless OTEL_ENABLED=true).
 * Call once, early in the process lifetime, before infrastructure
 * connections are established so their spans are captured.
 */
export function startOtel(): void {
  if (!OTEL_ENABLED) {
    return;
  }
  if (sdk) {
    return;
  }

  sdk = new NodeSDK({
    serviceName: OTEL_SERVICE_NAME,
    traceExporter: new OTLPTraceExporter({
      url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Keep file descriptors out of trace data (noisy + high cardinality)
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  // eslint-disable-next-line no-console
  console.log(
    `OpenTelemetry started (service=${OTEL_SERVICE_NAME}, endpoint=${OTEL_EXPORTER_OTLP_ENDPOINT})`
  );
}

/**
 * Shut the SDK down, flushing any pending spans. Safe to call when the
 * SDK was never started.
 */
export async function stopOtel(): Promise<void> {
  if (!sdk) {
    return;
  }
  const instance = sdk;
  sdk = null;
  try {
    await instance.shutdown();
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry SDK shut down');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error shutting down OpenTelemetry SDK:', error);
  }
}
