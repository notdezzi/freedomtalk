/**
 * FreedomTalk — message throughput + latency load test (Socket.IO gateway).
 * ============================================================================
 *
 * WHAT IT DOES (per VU iteration)
 *   1. Opens a Socket.IO connection to the API using the SAME auth the web
 *      client uses: handshake auth `{ token: <JWT> }` (server: auth.middleware.ts
 *      extractToken reads handshake.auth.token, Authorization header, or ?token=).
 *   2. Waits for the namespace CONNECT ack, then emits
 *        'room:join'  { roomType: 'channel', roomId: CHANNEL_ID }
 *      and waits for 'room:joined' (failure arrives as 'error' {code,message}).
 *   3. Emits MESSAGES_PER_ITER x
 *        'message:create' { channelId, content }
 *      Success/failure is signaled by SEPARATE server->client events, NOT by a
 *      socket.io ack callback (see message.handler.ts):
 *        success -> 'message:ack' { messageId, timestamp }
 *        failure -> 'error'       { code, message }
 *      We measure emit -> 'message:ack' latency and count errors/timeouts.
 *   4. Sleeps THINK_TIME between messages, then disconnects.
 *
 * CONTRACTS ENCODED (from packages/shared/src/constants/index.ts + handlers)
 *   room:join payload   { roomType: 'channel'|'server'|'dm', roomId }
 *   room:joined payload { roomType, roomId, timestamp }
 *   message:create      { channelId | dmChannelId, content(1..2000) }
 *   message:ack         { messageId, timestamp }
 *   error               { code, message }
 *
 * REQUIRED ENV
 *   CHANNEL_ID      id of a TEXT channel the load users can access (they must be
 *                   server members with VIEW_CHANNEL + SEND_MESSAGES)
 *   K6_EMAIL / K6_PASSWORD
 *                   a non-MFA member of the target server with CREATE_INVITE
 *                   (the server owner works) — used to invite the auto-created
 *                   pool users. Alternatively pass K6_INVITE_CODE directly.
 * Optional ENV (defaults)
 *   BASE_URL=http://localhost:3001   API origin (REST + WS on one port)
 *   K6_ORIGIN=http://localhost:3000  Origin header (must match API CORS_ORIGIN)
 *   K6_SERVER_ID=<id>                server the admin creates the invite for
 *   K6_INVITE_CODE=<code>            skip invite creation, use this code
 *   K6_AUTO_PROVISION=true|false     false => all VUs share K6_EMAIL account
 *   K6_POOL_SIZE=0 (= min(VUS,25))   number of throwaway users to create
 *   K6_LOAD_PASSWORD=K6LoadTest1234  password for pool users
 *   VUS=20  DURATION=2m  RAMP_UP=20%  RAMP_DOWN=10%
 *   MESSAGES_PER_ITER=10  THINK_TIME=1  MESSAGE_TIMEOUT=5000 (ms)
 *   CONNECT_TIMEOUT=10000 (ms)  JOIN_TIMEOUT=5000 (ms)
 *   ACK_P95_MS=500  ERROR_RATE_PCT=1  (thresholds)
 *
 * EXAMPLE
 *   BASE_URL=http://localhost:3001 CHANNEL_ID=123... K6_SERVER_ID=456... \
 *   K6_EMAIL=admin@example.com K6_PASSWORD=secret VUS=50 DURATION=5m \
 *   k6 run load/k6/messages.js
 *
 * API-side recommendations for a clean run (see load/README.md):
 *   SKIP_RATE_LIMIT=true        (register/login/invites are 5 per 15 min otherwise)
 *   JWT_EXPIRES_IN=2h           (access tokens default to 15m — long runs expire)
 */

import { sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { withSio } from './lib/sio.client.js';
import { provisionPool } from './lib/provision.js';
import {
  BASE_URL, WS_ORIGIN, CHANNEL_ID,
  VUS, DURATION_SEC, rampingStages,
  THINK_TIME_SEC, MESSAGES_PER_ITER, ACK_TIMEOUT_MS, JOIN_TIMEOUT_MS, CONNECT_TIMEOUT_MS,
  ACK_P95_MS, ERROR_RATE_PCT, JOIN_P95_MS, CONNECT_P95_MS,
  warnPerUserLimit, POOL_SIZE,
} from './lib/config.js';

const ackLatency = new Trend('message_ack_latency', true);
const roomJoinLatency = new Trend('room_join_latency', true);
const wsConnectLatency = new Trend('ws_connect_latency', true);
const errorRate = new Rate('message_error_rate');
const messagesSent = new Counter('messages_sent_total');
const messagesAcked = new Counter('messages_acked_total');

export const options = {
  // discardResponseBodies stays false: setup() provisions the user pool
  // via REST (login/invite/join) and reads those JSON bodies.
  scenarios: {
    messaging: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampingStages(VUS, DURATION_SEC),
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    message_ack_latency: ['p(95)<' + ACK_P95_MS],
    message_error_rate: ['rate<' + (ERROR_RATE_PCT / 100)],
    room_join_latency: ['p(95)<' + JOIN_P95_MS],
    ws_connect_latency: ['p(95)<' + CONNECT_P95_MS],
  },
};

export function setup() {
  if (!CHANNEL_ID) {
    throw new Error('CHANNEL_ID env var is required (id of a text channel the load users can access)');
  }
  const tokens = provisionPool(VUS);
  warnPerUserLimit(tokens.length, VUS);
  console.log('[k6] targeting channel ' + CHANNEL_ID + ' at ' + BASE_URL);
  return { tokens: tokens, channelId: CHANNEL_ID };
}

export default function (data) {
  const token = data.tokens[__VU % data.tokens.length];
  const channelId = data.channelId;

  // Callback state machine (async/await stalls inside k6 ws callbacks —
  // see load/k6/lib/sio.client.js header). One outstanding message at a
  // time so each 'message:ack'/'error' unambiguously belongs to our emit.
  const connectStart = Date.now();
  let joinStart = 0;
  let msgT0 = 0;
  let sent = 0;
  let acked = 0;
  let awaitingAck = false;
  let finished = false;

  const state = withSio(
    { baseUrl: BASE_URL, token: token, origin: WS_ORIGIN },
    function (client) {
      const finish = (failed) => {
        if (finished) return;
        finished = true;
        if (failed) errorRate.add(1);
        client.close();
      };

      // hard iteration budget: everything twice over, then give up
      client.setTimeout(function () { finish(true); },
        2 * (CONNECT_TIMEOUT_MS + JOIN_TIMEOUT_MS + MESSAGES_PER_ITER * (ACK_TIMEOUT_MS + THINK_TIME_SEC * 1000)));

      client.onConnect(function () {
        wsConnectLatency.add(Date.now() - connectStart);
        joinStart = Date.now();
        client.emit('room:join', { roomType: 'channel', roomId: channelId });
      });
      client.onConnectError(function () { finish(true); });

      client.on('room:joined', function () {
        roomJoinLatency.add(Date.now() - joinStart);
        sendNext();
      });

      client.on('message:ack', function () {
        if (!awaitingAck) return;
        awaitingAck = false;
        ackLatency.add(Date.now() - msgT0);
        messagesAcked.add(1);
        errorRate.add(0);
        acked++;
        client.setTimeout(sendNext, THINK_TIME_SEC * 1000);
      });

      client.on('error', function () {
        if (awaitingAck) {
          // handler rejected the current message — count and move on
          awaitingAck = false;
          errorRate.add(1);
          client.setTimeout(sendNext, THINK_TIME_SEC * 1000);
        } else {
          finish(true);
        }
      });

      function sendNext() {
        if (finished || awaitingAck) return;
        if (sent >= MESSAGES_PER_ITER) {
          if (acked >= MESSAGES_PER_ITER) finish(false);
          return;
        }
        sent++;
        msgT0 = Date.now();
        awaitingAck = true;
        client.emit('message:create', {
          channelId: channelId,
          content: 'k6 load | vu=' + __VU + ' seq=' + sent + ' ts=' + msgT0,
        });
        messagesSent.add(1);
        client.setTimeout(function () {
          if (awaitingAck) {
            awaitingAck = false;
            errorRate.add(1);
            sendNext();
          }
        }, ACK_TIMEOUT_MS);
      }
    }
  );

  // connect-level failures (refused, DNS, handler sync throw)
  if (state.error) {
    errorRate.add(1);
  }
}
