/**
 * FreedomTalk — voice channel SIGNALING load test (Socket.IO + mediasoup).
 * ============================================================================
 *
 * This script exercises the WebRTC SIGNALING plane only. Real RTP media
 * (SRTP over UDP) requires a WebRTC stack k6 does not have, so the mediasoup
 * transport/producer/consumer DTLS handshake is NOT performed — we measure the
 * server-side signaling costs: voice session creation, mediasoup router/
 * participant bookkeeping, transport allocation, and voice state round-trips.
 *
 * WHAT IT DOES
 *   scenario "signaling" (ramping VUs), per iteration:
 *     1. Socket.IO connect with handshake auth { token: <JWT> }.
 *     2. 'voice:join' { channelId } WITH socket.io ack callback ->
 *        { success: true, data: { sessionId, rtpCapabilities, producers,
 *          existingUsers } } | { success: false, error }   (voice.handler.ts)
 *     3. 'voice:create_transport' { direction: 'send' } with ack
 *        -> { success, data: { transport } }   (no DTLS connect — needs WebRTC)
 *     4. 'voice:state_update' { selfMute, selfDeaf } with ack -> { success, data }
 *     5. hold VOICE_HOLD seconds, then 'voice:leave' (callback-only event,
 *        NO data argument — the handler signature is (callback) => ...) with ack.
 *
 *   scenario "reconnect" (constant VUs): connect -> voice:join -> hard
 *   disconnect WITHOUT voice:leave, repeatedly. Measures join latency under
 *   churn + exercises the server's disconnect cleanup path
 *   (mediasoup removeParticipant + voice state deletion + voice:user_left).
 *
 * CONTRACTS ENCODED (packages/api/src/services/websocket/handlers/voice.handler.ts)
 *   voice:join            data { channelId }, ack { success, data{sessionId,...} }
 *   voice:create_transport data { direction: 'send'|'recv' }, ack { success, data{transport} }
 *   voice:state_update    data { selfMute?, selfDeaf? }, ack { success, data }
 *   voice:leave           NO data, ack { success }
 *   broadcast side effects we listen for but do not require:
 *     voice:user_joined / voice:user_left / voice:user_state
 *
 * REQUIRED ENV
 *   VOICE_CHANNEL_ID  id of a VOICE-type channel the load users can access
 *                     (server members with CONNECT permission).
 *   K6_EMAIL / K6_PASSWORD  (or K6_INVITE_CODE) — see messages.js header.
 * Optional ENV (defaults)
 *   BASE_URL=http://localhost:3001   K6_ORIGIN=http://localhost:3000
 *   K6_SERVER_ID=<id>  K6_AUTO_PROVISION=true  K6_POOL_SIZE=0 (= min(VUS,25))
 *   VUS=10  DURATION=2m  VOICE_HOLD=5  VOICE_TIMEOUT=8000 (ms)
 *   RECONNECT_VUS=5  RECONNECT_RATE... (constant-vus executor)
 *   VOICE_JOIN_P95_MS=800  ERROR_RATE_PCT=1  CONNECT_P95_MS=2000
 *
 * NOTE: voice:join calls mediasoupService.getOrCreateRoom, so the API must
 * have mediasoup workers enabled (default in this codebase) or every join
 * fails and the error threshold trips.
 *
 * EXAMPLE
 *   BASE_URL=http://localhost:3001 VOICE_CHANNEL_ID=123... K6_SERVER_ID=456... \
 *   K6_EMAIL=admin@example.com K6_PASSWORD=secret VUS=10 DURATION=3m \
 *   k6 run load/k6/voice-signaling.js
 */

import { Trend, Rate, Counter } from 'k6/metrics';
import { withSio } from './lib/sio.client.js';
import { provisionPool } from './lib/provision.js';
import {
  BASE_URL, WS_ORIGIN, VOICE_CHANNEL_ID,
  VUS, DURATION_SEC, rampingStages,
  VOICE_HOLD_SEC, VOICE_TIMEOUT_MS, CONNECT_TIMEOUT_MS,
  VOICE_JOIN_P95_MS, ERROR_RATE_PCT, CONNECT_P95_MS,
  intEnv, warnPerUserLimit,
} from './lib/config.js';

const RECONNECT_VUS = intEnv('RECONNECT_VUS', Math.min(5, VUS));

const voiceJoinLatency = new Trend('voice_join_latency', true);
const transportLatency = new Trend('voice_transport_create_latency', true);
const stateUpdateLatency = new Trend('voice_state_update_latency', true);
const leaveLatency = new Trend('voice_leave_latency', true);
const reconnectJoinLatency = new Trend('voice_reconnect_join_latency', true);
const wsConnectLatency = new Trend('ws_connect_latency', true);
const voiceErrorRate = new Rate('voice_error_rate');
const joinedTotal = new Counter('voice_joined_total');
const leftTotal = new Counter('voice_left_total');
const reconnectCycles = new Counter('voice_reconnect_cycles_total');

export const options = {
  // discardResponseBodies stays false: setup() provisions the user pool
  // via REST (login/invite/join) and reads those JSON bodies.
  scenarios: {
    signaling: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampingStages(VUS, DURATION_SEC),
      gracefulRampDown: '15s',
      exec: 'signalingLoop',
    },
    reconnect: {
      executor: 'constant-vus',
      vus: RECONNECT_VUS,
      duration: DURATION_SEC + 's',
      gracefulStop: '10s',
      exec: 'reconnectLoop',
    },
  },
  thresholds: {
    voice_join_latency: ['p(95)<' + VOICE_JOIN_P95_MS],
    voice_error_rate: ['rate<' + (ERROR_RATE_PCT / 100)],
    ws_connect_latency: ['p(95)<' + CONNECT_P95_MS],
  },
};

export function setup() {
  if (!VOICE_CHANNEL_ID) {
    throw new Error('VOICE_CHANNEL_ID env var is required (id of a VOICE channel the load users can access)');
  }
  const tokens = provisionPool(VUS + RECONNECT_VUS);
  warnPerUserLimit(tokens.length, VUS + RECONNECT_VUS);
  console.log('[k6] targeting voice channel ' + VOICE_CHANNEL_ID + ' at ' + BASE_URL);
  return { tokens: tokens, voiceChannelId: VOICE_CHANNEL_ID };
}

/** voice:join + signaling exchange + voice:leave, one full cycle per iteration. */
export function signalingLoop(data) {
  const token = data.tokens[__VU % data.tokens.length];
  const channelId = data.voiceChannelId;
  const connectStart = Date.now();

  // Callback chains — async/await stalls inside k6 ws callbacks
  // (see load/k6/lib/sio.client.js header).
  const state = withSio(
    { baseUrl: BASE_URL, token: token, origin: WS_ORIGIN, tag: 'voice-signaling' },
    function (client) {
      let finished = false;
      const finish = (failed) => {
        if (finished) return;
        finished = true;
        // Rate metrics need explicit add(0) samples on success, otherwise
        // the ratio is 100% by construction (only failures are sampled)
        voiceErrorRate.add(failed ? 1 : 0);
        client.close();
      };
      client.setTimeout(function () { finish(true); }, 5 * VOICE_TIMEOUT_MS + VOICE_HOLD_SEC * 1000);

      client.onConnect(function () {
        wsConnectLatency.add(Date.now() - connectStart);

        // join voice channel (creates voice state + mediasoup participant)
        const joinStart = Date.now();
        client.emitWithCallback('voice:join', [{ channelId: channelId }], function (joinAck, err) {
          if (err || !joinAck || joinAck.success !== true) { finish(true); return; }
          voiceJoinLatency.add(Date.now() - joinStart);
          joinedTotal.add(1);

          // create a send transport (signaling only — DTLS/RTP needs a real client)
          const trStart = Date.now();
          client.emitWithCallback('voice:create_transport', [{ direction: 'send' }], function (trAck, trErr) {
            if (trErr || !trAck || trAck.success !== true) { finish(true); return; }
            transportLatency.add(Date.now() - trStart);

            // voice state round-trip (mute flag; broadcasts voice:user_state)
            const stStart = Date.now();
            client.emitWithCallback('voice:state_update', [{ selfMute: true, selfDeaf: false }], function (stAck, stErr) {
              if (stErr || !stAck || stAck.success !== true) { finish(true); return; }
              stateUpdateLatency.add(Date.now() - stStart);

              // hold the session, then leave — handler signature is (callback)
              client.setTimeout(function () {
                const leaveStart = Date.now();
                client.emitWithCallback('voice:leave', [], function (leaveAck, lErr) {
                  if (lErr || !leaveAck || leaveAck.success !== true) { finish(true); return; }
                  leaveLatency.add(Date.now() - leaveStart);
                  leftTotal.add(1);
                  finish(false);
                }, VOICE_TIMEOUT_MS);
              }, VOICE_HOLD_SEC * 1000);
            }, VOICE_TIMEOUT_MS);
          }, VOICE_TIMEOUT_MS);
        }, VOICE_TIMEOUT_MS);
      });
      client.onConnectError(function () { finish(true); });
    }
  );

  if (state.error) {
    voiceErrorRate.add(1);
  }
}

/** Connect -> voice:join -> abrupt disconnect (exercises cleanup path). */
export function reconnectLoop(data) {
  const token = data.tokens[__VU % data.tokens.length];
  const channelId = data.voiceChannelId;

  const state = withSio(
    { baseUrl: BASE_URL, token: token, origin: WS_ORIGIN, tag: 'voice-reconnect' },
    function (client) {
      client.setTimeout(function () { client.close(); }, 2 * VOICE_TIMEOUT_MS);

      client.onConnect(function () {
        const joinStart = Date.now();
        client.emitWithCallback('voice:join', [{ channelId: channelId }], function (joinAck, err) {
          if (err || !joinAck || joinAck.success !== true) { voiceErrorRate.add(1); client.close(); return; }
          voiceErrorRate.add(0);
          reconnectJoinLatency.add(Date.now() - joinStart);
          reconnectCycles.add(1);
          // no voice:leave — the 'disconnect' handler must clean up the session
          client.setTimeout(function () { client.close(); }, 200);
        }, VOICE_TIMEOUT_MS);
      });
      client.onConnectError(function () { voiceErrorRate.add(1); });
    }
  );

  if (state.error) {
    voiceErrorRate.add(1);
  }
}
