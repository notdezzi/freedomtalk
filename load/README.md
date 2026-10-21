# FreedomTalk — Load Tests (k6)

k6 scripts for the Socket.IO gateway, message pipeline, voice signaling plane, and
connection churn of `packages/api`.

> **Important: why these scripts do not use `k6/experimental/socketio`**
> That module does not exist in any released version of k6 — it is absent from the
> [grafana/k6 source tree](https://github.com/grafana/k6), from every release note
> (v0.1 through v2.x), and from the official docs (verified 2026-10: zero code-search
> hits, zero release-note mentions, and no commits ever touched such a path).
> Instead, [`load/k6/lib/sio.client.js`](k6/lib/sio.client.js) implements the exact
> Socket.IO v4 wire protocol (engine.io EIO=4 over websocket) on top of k6's core,
> stable `k6/ws` module, so the scripts speak the real protocol the API expects and
> run on any modern k6.

---

## Prerequisites

1. **k6** installed — <https://grafana.com/docs/k6/latest/set-up/install-k6/>
2. **Backend stack running** (Postgres/TimescaleDB, Redis, RabbitMQ, MinIO, Meilisearch —
   e.g. `docker compose up -d`) and the API running (`packages/api`).
3. **A target server + channels seeded**, and a **load-test admin account**:
   - `K6_EMAIL` / `K6_PASSWORD` — an existing, **non-MFA** account that is a member of the
     target server **with the `CREATE_INVITE` permission** (the server owner works).
   - The target channel's default (@everyone) role must allow `VIEW_CHANNEL` + `SEND_MESSAGES`
     (and `CONNECT` for the voice channel), otherwise every `message:create` / `voice:join`
     fails with `FORBIDDEN`.

### Recommended API settings during load tests

| Setting | Why |
|---|---|
| `SKIP_RATE_LIMIT=true` | register / login / invites are rate limited to **5 per 15 min per IP**; auto-provisioning a user pool trips this immediately. |
| `JWT_EXPIRES_IN=2h` (>= run duration) | Access tokens default to **15m**; pool users are provisioned once in `setup()` and reused for the whole run. |
| `WS_MAX_CONNECTIONS_PER_USER` (raise, or size the pool) | Default **5** concurrent sockets per user. The scripts create a pool of distinct users (`K6_POOL_SIZE`, default `min(VUS, 25)`); keep `VUS <= POOL_SIZE x 5` or raise the cap. |
| `NODE_ENV` not `test` if you want realistic rate limiting; either way note login cost | Each login creates a Redis session + DB reads. |

---

## Environment variables

| Variable | Default | Used by | Meaning |
|---|---|---|---|
| `BASE_URL` | `http://localhost:3001` | all | API origin. **The API listens on 3001 by default** (`packages/api/.env.example`: `PORT=3001`; REST and Socket.IO share the port). Port 3000 is the Next.js web app. |
| `K6_ORIGIN` | `http://localhost:3000` | all | `Origin` header on WS handshakes; must match the API's `CORS_ORIGIN`. |
| `CHANNEL_ID` | — | messages, churn | **Text channel id** the pool users can access (`room:join` target + `message:create` target). |
| `VOICE_CHANNEL_ID` | — | voice | **Voice-type channel id** with `CONNECT` permission. Falls back to `CHANNEL_ID` if unset. |
| `K6_EMAIL` / `K6_PASSWORD` | — | all | Non-MFA admin member with `CREATE_INVITE` (used to invite pool users; or the shared account in single-account mode). |
| `K6_INVITE_CODE` | — | all | Use this invite instead of having the admin create one. |
| `K6_SERVER_ID` | — | all | Server id for on-the-fly invite creation (required unless `K6_INVITE_CODE` is set). |
| `K6_AUTO_PROVISION` | `true` | all | `false` = skip pool creation; all VUs share the `K6_EMAIL` account (watch the per-user connection cap). |
| `K6_POOL_SIZE` | `min(VUS, 25)` | all | Number of throwaway users to register + login + server-join in `setup()`. |
| `K6_LOAD_PASSWORD` | `K6LoadTest1234` | all | Password given to pool users. |
| `VUS` | 20 (10 voice, 50 churn) | all | Target VU count. |
| `DURATION` | `2m` | all | Total run length (accepts `30s`, `5m`, `1h`…). Ramping: 20% up / hold / 10% down; override with `RAMP_UP` / `RAMP_DOWN`. |
| `MESSAGES_PER_ITER` | 10 | messages | Messages per connection cycle. |
| `THINK_TIME` | 1 (s) | messages | Sleep between messages. |
| `MESSAGE_TIMEOUT` | 5000 (ms) | messages | `message:ack` timeout before counting an error. |
| `CONNECT_TIMEOUT` | 10000 (ms) | all | Namespace-connect timeout. |
| `JOIN_TIMEOUT` | 5000 (ms) | messages, churn | `room:joined` timeout. |
| `VOICE_HOLD` | 5 (s) | voice | Time parked in the voice channel before `voice:leave`. |
| `VOICE_TIMEOUT` | 8000 (ms) | voice | Ack timeout for voice signaling events. |
| `RECONNECT_VUS` | `min(VUS, 5)` | voice | VUs in the constant connect/kill cycle scenario. |
| `ACK_P95_MS` | 500 | messages | Threshold: message ack p95 latency. |
| `ERROR_RATE_PCT` | 1 | messages, voice | Threshold: error rate in percent. |
| `CONNECT_P95_MS` | 2000 | messages, churn, voice | Threshold: WS connect p95. |
| `JOIN_P95_MS` | 1000 | messages, churn | Threshold: room join p95. |
| `VOICE_JOIN_P95_MS` | 800 | voice | Threshold: `voice:join` ack p95. |

---

## Scripts

### `k6 run load/k6/messages.js` — message pipeline

Per iteration: connect (JWT handshake) -> `room:join {roomType:'channel', roomId}` ->
`MESSAGES_PER_ITER` x (`message:create {channelId, content}` + think time) -> disconnect.

Note: the server does **not** answer `message:create` with a socket.io ack callback.
Success arrives as a separate `message:ack {messageId, timestamp}` event; failures as
`error {code, message}` (see `packages/api/src/services/websocket/handlers/message.handler.ts`).
The script keeps exactly one message in flight per socket so acknowledgements are unambiguous.

**Measures:** `message_ack_latency` (emit -> `message:ack`), `room_join_latency`,
`ws_connect_latency`, `message_error_rate`, totals.

**Thresholds:** ack p95 < 500 ms, error rate < 1%, join p95 < 1 s, connect p95 < 2 s.

### `k6 run load/k6/voice-signaling.js` — voice signaling plane

Signaling only — k6 cannot do WebRTC RTP, so the mediasoup DTLS/producer/consumer
handshake is **not** exercised. Per cycle: connect -> `voice:join {channelId}` (ack) ->
`voice:create_transport {direction:'send'}` (ack) -> `voice:state_update` (ack) ->
hold -> `voice:leave` (ack, callback-only event). A second constant-VU scenario
(`reconnect`) joins and hard-disconnects without leave to exercise the cleanup path.

**Measures:** `voice_join_latency`, `voice_transport_create_latency`,
`voice_state_update_latency`, `voice_leave_latency`, `voice_reconnect_join_latency`,
`voice_error_rate`, connect latency, join/leave totals.

**Thresholds:** `voice:join` ack p95 < 800 ms, error rate < 1%, connect p95 < 2 s.

**Requires:** mediasoup workers enabled in the API (default here) — `voice:join`
creates a mediasoup router/participant; without workers every join fails.

### `k6 run load/k6/churn.js` — connect/disconnect storm

Per iteration a fresh full lifecycle: TCP+WS handshake -> namespace CONNECT (JWT verify,
DB user load, per-user + global connection limits, presence, subscription sync) ->
`authenticated` -> `room:join` -> `room:joined` -> disconnect. Everything is re-measured
per connection, so this stresses the handshake path hardest.

**Measures:** `churn_connect_duration` (through namespace connect),
`churn_join_duration`, `churn_ready_duration` (connect -> room joined),
`churn_connect_success_rate`, `churn_join_success_rate`, cycle count.

**Thresholds:** connect success > 99% and p95 < 2 s, join success > 99% and p95 < 1 s.

---

## Running

```bash
# messages (adjust ids + credentials to your seed data)
BASE_URL=http://localhost:3001 \
CHANNEL_ID=<text-channel-id> \
K6_SERVER_ID=<server-id> \
K6_EMAIL=admin@example.com K6_PASSWORD=admin-password \
VUS=50 DURATION=5m MESSAGES_PER_ITER=10 THINK_TIME=1 \
k6 run load/k6/messages.js

# voice signaling
BASE_URL=http://localhost:3001 \
VOICE_CHANNEL_ID=<voice-channel-id> \
K6_SERVER_ID=<server-id> \
K6_EMAIL=admin@example.com K6_PASSWORD=admin-password \
VUS=10 RECONNECT_VUS=5 DURATION=3m \
k6 run load/k6/voice-signaling.js

# churn
BASE_URL=http://localhost:3001 \
CHANNEL_ID=<text-channel-id> \
K6_SERVER_ID=<server-id> \
K6_EMAIL=admin@example.com K6_PASSWORD=admin-password \
VUS=100 DURATION=3m \
k6 run load/k6/churn.js
```

On Windows PowerShell, set env vars with `$env:BASE_URL="http://localhost:3001"` first, or use
`-e` overrides: `k6 run -e BASE_URL=http://localhost:3001 -e CHANNEL_ID=... load/k6/messages.js`.

Cloud/distributed runs: `k6 cloud run load/k6/messages.js` (same env vars; point `BASE_URL`
at a publicly reachable API and create the invite manually if the cloud load generators
cannot reach your admin login — pass `K6_INVITE_CODE` in that case).

### What a successful setup() looks like

```
[k6] created load-test invite for server <id>
[k6] provisioning 25 load-test users (run xyz123)...
[k6] provisioned 25 users
[k6] targeting channel <id> at http://localhost:3001
```

If you see `login failed ... (HTTP 429)` the API is rate limiting — set `SKIP_RATE_LIMIT=true`.
If you see `requires MFA`, use a non-MFA account.

---

## Results

Measured 2026-10-07 against the Dockerized stack on the reference machine below.
Every run passed all its thresholds. Reproduce with the exact commands in [Running](#running).

**Reference machine:** Windows 11 x64, 20 logical CPUs, 16 GB RAM, Docker Desktop
(API + worker + Postgres + Redis + RabbitMQ + Meilisearch each in their own container,
`node:20-alpine` images). Load generator: native k6 v2.3.0 on the host.

**API settings during the runs:** `SKIP_RATE_LIMIT=true`, `JWT_EXPIRES_IN=2h`,
`WS_MAX_CONNECTIONS_PER_USER=200`, `WS_MAX_CONNECTIONS_PER_IP=1000000` (the per-IP
connection-rate limiter defaults to 10 conns/60s per IP — all load generators share
one IP, so it is raised for the run; tunable via env since this measurement).

### messages.js — 20 VUs, 2 min, 10 msgs/iteration, 1 s think time

| metric | value |
|---|---|
| messages acked | 2,110 |
| error rate | 0.00% (0 / 2,110) |
| ack latency | p50 9 ms · p95 13 ms · max 30 ms |
| room join p95 | 12.5 ms |
| WS connect p95 | 6 ms |
| throughput | ~15.4 acked msgs/s sustained (per-VU pacing limited) |

During the run: API container 12.8% CPU / 130 MB RSS, worker 8.5% / 43 MB,
RabbitMQ ~300% CPU (topic-exchange fanout to 3 queues — the hottest component),
Postgres 7.6%, Meilisearch 13.5%. The broker fanout, not the API, is the first
component to watch when scaling message throughput.

### voice-signaling.js — 10 VUs signaling loop + 5 VUs reconnect loop, 1 min

| scenario | cycles | join p50 | join p95 | transport p95 | leave p95 | error rate |
|---|---|---|---|---|---|---|
| signaling (join → transport → state → hold → leave) | 162 | 16 ms | 28 ms | 4 ms | 7 ms | 0.13% |
| reconnect (join → abrupt disconnect) | 1,311 | 18 ms | 34 ms | — | — | (shared) |

The two reconnect-loop failures (2 / 1,474 total samples) are joins landing during a
disconnect-cleanup race — the exact path the reconnect scenario exists to exercise.

### churn.js — 50 VUs, 1 min, full lifecycle per iteration

| metric | value |
|---|---|
| complete connect → auth → join → disconnect cycles | 10,412 (~145/s) |
| connect success | 100.00% |
| connect duration | p50 121 ms · p95 158 ms |
| join success | 100.00% |
| join duration p95 | 157 ms |


