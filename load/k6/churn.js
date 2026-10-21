/**
 * FreedomTalk — WebSocket connection churn load test.
 * ============================================================================
 *
 * N VUs repeatedly perform a full lifecycle against the Socket.IO gateway:
 *
 *   TCP/TLS + engine.io websocket upgrade
 *     -> namespace CONNECT with handshake auth { token: <JWT> }
 *        (server runs auth middleware: JWT verify + user DB load + status check)
 *     -> connection established (global + per-user connection limits enforced,
 *        presence set online, subscription sync) + 'authenticated' event
 *     -> 'room:join' { roomType: 'channel', roomId }  ->  'room:joined'
 *     -> immediate disconnect
 *
 * Every iteration is a fresh connection, so this measures handshake cost
 * (JWT + Postgres lookups + Redis presence + subscription sync) under churn.
 *
 * THRESHOLDS
 *   churn_connect_success_rate > 99%
 *   churn_connect_duration p95 < CONNECT_P95_MS (default 2000ms)
 *   churn_join_success_rate    > 99%
 *   churn_join_duration   p95 < JOIN_P95_MS (default 1000ms)
 *
 * REQUIRED ENV
 *   CHANNEL_ID           text channel the load users can access
 *   K6_EMAIL/K6_PASSWORD or K6_INVITE_CODE  (pool provisioning, see messages.js)
 * Optional ENV (defaults)
 *   BASE_URL=http://localhost:3001   K6_ORIGIN=http://localhost:3000
 *   K6_SERVER_ID=<id>  K6_AUTO_PROVISION=true  K6_POOL_SIZE=0 (= min(VUS,25))
 *   VUS=50  DURATION=2m  CONNECT_TIMEOUT=10000  JOIN_TIMEOUT=5000
 *   CONNECT_P95_MS=2000  JOIN_P95_MS=1000
 *
 * EXAMPLE
 *   BASE_URL=http://localhost:3001 CHANNEL_ID=123... K6_SERVER_ID=456... \
 *   K6_EMAIL=admin@example.com K6_PASSWORD=secret VUS=100 DURATION=3m \
 *   k6 run load/k6/churn.js
 */

import { Trend, Rate, Counter } from 'k6/metrics';
import { withSio } from './lib/sio.client.js';
import { provisionPool } from './lib/provision.js';
import {
  BASE_URL, WS_ORIGIN, CHANNEL_ID,
  VUS, DURATION_SEC, rampingStages,
  CONNECT_TIMEOUT_MS, JOIN_TIMEOUT_MS,
  CONNECT_P95_MS, JOIN_P95_MS,
  warnPerUserLimit,
} from './lib/config.js';

const connectDuration = new Trend('churn_connect_duration', true);
const joinDuration = new Trend('churn_join_duration', true);
const readyDuration = new Trend('churn_ready_duration', true);
const connectSuccess = new Rate('churn_connect_success_rate');
const joinSuccess = new Rate('churn_join_success_rate');
const cycles = new Counter('churn_cycles_total');

export const options = {
  // discardResponseBodies stays false: setup() provisions the user pool
  // via REST (login/invite/join) and reads those JSON bodies.
  scenarios: {
    churn: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampingStages(VUS, DURATION_SEC),
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    churn_connect_success_rate: ['rate>0.99'],
    churn_connect_duration: ['p(95)<' + CONNECT_P95_MS],
    churn_join_success_rate: ['rate>0.99'],
    churn_join_duration: ['p(95)<' + JOIN_P95_MS],
  },
};

export function setup() {
  if (!CHANNEL_ID) {
    throw new Error('CHANNEL_ID env var is required (id of a text channel the load users can access)');
  }
  const tokens = provisionPool(VUS);
  warnPerUserLimit(tokens.length, VUS);
  console.log('[k6] churn target: channel ' + CHANNEL_ID + ' at ' + BASE_URL);
  return { tokens: tokens, channelId: CHANNEL_ID };
}

export default function (data) {
  const token = data.tokens[__VU % data.tokens.length];
  const channelId = data.channelId;
  let connected = false;
  let joined = false;
  let finished = false;
  const connectStart = Date.now();

  // Callback state machine — async/await stalls inside k6 ws callbacks
  // (see load/k6/lib/sio.client.js header).
  const state = withSio(
    { baseUrl: BASE_URL, token: token, origin: WS_ORIGIN, tag: 'churn' },
    function (client) {
      const finish = () => {
        if (finished) return;
        finished = true;
        client.close();
      };
      client.setTimeout(finish, 2 * (CONNECT_TIMEOUT_MS + JOIN_TIMEOUT_MS) + 5000);

      client.onConnect(function () {
        // handshake + auth middleware done; wait for the app-level
        // 'authenticated' event (fires after presence + subscription sync)
        client.expect('authenticated', function (_arg, err) {
          if (err) { finish(); return; }
          connectDuration.add(Date.now() - connectStart);
          connected = true;

          const joinStart = Date.now();
          client.emit('room:join', { roomType: 'channel', roomId: channelId });
          client.expectAny(['room:joined', 'error'], function (_arg, jerr, which) {
            joinDuration.add(Date.now() - joinStart);
            if (jerr || which !== 'room:joined') { finish(); return; }
            joined = true;
            // full lifecycle: connect -> authenticated -> room joined
            readyDuration.add(Date.now() - connectStart);
            finish();
          }, JOIN_TIMEOUT_MS);
        }, CONNECT_TIMEOUT_MS);
      });
      client.onConnectError(function () { finish(); });
    }
  );

  connectSuccess.add(connected ? 1 : 0);
  joinSuccess.add(joined ? 1 : 0);
  if (connected && joined) {
    cycles.add(1);
  }
  if (state.error) {
    // keep the failure visible in the default k6 log without spamming per-iteration
    if (__ITER === 0) {
      console.warn('[k6] churn cycle error (vu=' + __VU + '): ' + state.error.message);
    }
  }
}
