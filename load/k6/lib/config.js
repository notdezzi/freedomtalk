/**
 * Shared environment configuration for the FreedomTalk k6 scripts.
 *
 * IMPORTANT — BASE_URL DEFAULT: the API server listens on port 3001 by default
 * (packages/api/src/index.ts: `process.env.PORT || '3001'`, and
 * packages/api/.env.example sets PORT=3001; the web app's NEXT_PUBLIC_WS_URL
 * also defaults to http://localhost:3001). Port 3000 is the Next.js web app.
 * Override BASE_URL if your stack differs.
 */

// API base URL, no trailing slash. REST endpoints live under {BASE_URL}/api/v1.
export const BASE_URL = String(__ENV.BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

// Origin header sent on websocket handshakes; must satisfy the API's CORS
// config (packages/api/src/config/websocket.ts defaults CORS_ORIGIN to
// 'http://localhost:3000').
export const WS_ORIGIN = __ENV.K6_ORIGIN || 'http://localhost:3000';

// Load-test account(s). K6_EMAIL must be an existing, non-MFA member of the
// target server with the CREATE_INVITE permission (the server owner works).
export const ADMIN_EMAIL = __ENV.K6_EMAIL || '';
export const ADMIN_PASSWORD = __ENV.K6_PASSWORD || '';

// Alternative to K6_EMAIL/K6_PASSWORD for provisioning: an existing invite
// code that pool users can join with (POST /api/v1/servers/join).
export const INVITE_CODE = __ENV.K6_INVITE_CODE || '';

// Target server id (required when we create the invite ourselves).
export const SERVER_ID = __ENV.K6_SERVER_ID || '';

// Target channel for room:join + message:create (a TEXT channel the users can access).
export const CHANNEL_ID = __ENV.CHANNEL_ID || __ENV.ROOM_ID || '';

// Target channel for voice:join (a VOICE-type channel with CONNECT permission).
export const VOICE_CHANNEL_ID = __ENV.VOICE_CHANNEL_ID || __ENV.CHANNEL_ID || '';

// Auto-provision pool users (register + login + server join) during setup().
export const AUTO_PROVISION = String(__ENV.K6_AUTO_PROVISION === undefined ? 'true' : __ENV.K6_AUTO_PROVISION) !== 'false';

// Pool size; 0 = min(target VUs, 25). Each pool user is a distinct account so
// the server's per-user connection cap (WS_MAX_CONNECTIONS_PER_USER, default 5)
// is not hit.
export const POOL_SIZE = intEnv('K6_POOL_SIZE', 0);

// Load-shape knobs.
export const VUS = intEnv('VUS', 20);
export const DURATION_SEC = durationToSec(__ENV.DURATION, 120);

// Behaviour knobs.
export const THINK_TIME_SEC = Number(__ENV.THINK_TIME || '1');
export const MESSAGES_PER_ITER = intEnv('MESSAGES_PER_ITER', 10);
export const ACK_TIMEOUT_MS = intEnv('MESSAGE_TIMEOUT', 5000);
export const JOIN_TIMEOUT_MS = intEnv('JOIN_TIMEOUT', 5000);
export const CONNECT_TIMEOUT_MS = intEnv('CONNECT_TIMEOUT', 10000);
export const VOICE_TIMEOUT_MS = intEnv('VOICE_TIMEOUT', 8000);
export const VOICE_HOLD_SEC = Number(__ENV.VOICE_HOLD || '5');

// Threshold knobs.
export const ACK_P95_MS = intEnv('ACK_P95_MS', 500);
export const ERROR_RATE_PCT = Number(__ENV.ERROR_RATE_PCT || '1');
export const JOIN_P95_MS = intEnv('JOIN_P95_MS', 1000);
export const CONNECT_P95_MS = intEnv('CONNECT_P95_MS', 2000);
export const VOICE_JOIN_P95_MS = intEnv('VOICE_JOIN_P95_MS', 800);

export const LOAD_PASSWORD = __ENV.K6_LOAD_PASSWORD || 'K6LoadTest1234';

export function intEnv(name, def) {
  const v = parseInt(__ENV[name] || '', 10);
  return isFinite(v) ? v : def;
}

/** Parse '500ms' | '30s' | '2m' | '1h' into seconds; default when absent/bad. */
export function durationToSec(input, defSec) {
  if (input === undefined || input === null || String(input).trim() === '') return defSec;
  const m = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/.exec(String(input).trim());
  if (!m) return defSec;
  const n = parseFloat(m[1]);
  switch (m[2] || 's') {
    case 'ms': return n / 1000;
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return defSec;
  }
}

/** Compose ramping-vus stages from VUS/DURATION (+optional RAMP_UP/RAMP_DOWN). */
export function rampingStages(targetVus, totalSec) {
  const rampUp = durationToSec(__ENV.RAMP_UP, Math.max(15, Math.round(totalSec * 0.2)));
  const rampDown = durationToSec(__ENV.RAMP_DOWN, Math.max(10, Math.round(totalSec * 0.1)));
  const hold = Math.max(0, Math.round(totalSec - rampUp - rampDown));
  return [
    { duration: rampUp + 's', target: targetVus },
    { duration: hold + 's', target: targetVus },
    { duration: rampDown + 's', target: 0 },
  ];
}

/** Warn (init context) when the pool cannot satisfy the per-user WS conn cap. */
export function warnPerUserLimit(poolSize, targetVus) {
  // Server default: WS_MAX_CONNECTIONS_PER_USER = 5
  const perUser = 5;
  if (targetVus > poolSize * perUser) {
    console.warn('[k6] WARNING: VUS=' + targetVus + ' exceeds POOL_SIZE=' + poolSize +
      ' x ' + perUser + ' (server default WS_MAX_CONNECTIONS_PER_USER). Either raise ' +
      'K6_POOL_SIZE, or set WS_MAX_CONNECTIONS_PER_USER on the API.');
  }
}
