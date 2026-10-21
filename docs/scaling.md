# Scaling FreedomTalk to multiple nodes

FreedomTalk is designed as a shared-nothing app tier over shared stateful
services. This document describes what already works when you run more
than one API node, how to run it, and the path for scaling voice (SFU)
capacity.

```
            ┌─────────┐
            │  nginx  │  (ip_hash → sticky WS)
            └────┬────┘
       ┌─────────┴─────────┐
┌──────┴──────┐      ┌─────┴───────┐
│   api-1     │      │   api-2     │   stateless app nodes
│ WORKER_ID=1 │      │ WORKER_ID=2 │   (REST + Socket.io + mediasoup)
└──────┬──────┘      └─────┬───────┘
       │      ┌────────┐   │
       └──────► worker ◄──┘   background pipeline (search/embeds/mentions)
              └───┬────┘
    ┌─────────┬───┴──────┬──────────┐
┌───┴───┐ ┌───┴──┐ ┌─────┴────┐ ┌───┴─────┐
│postgres│ │redis │ │ rabbitmq │ │meili/   │
│        │ │      │ │          │ │minio    │
└────────┘ └──────┘ └──────────┘ └─────────┘
     shared stateful tier (single writer per service; scale vertically first)
```

## Run it

```bash
JWT_PRIVATE_KEY=... JWT_PUBLIC_KEY=... \
  docker compose -f docker-compose.scale.yml up -d --build
# app on http://localhost:8080 (nginx → api-1/api-2), RabbitMQ UI on :15672
```

See `docker-compose.scale.yml`. Each node gets a distinct `WORKER_ID`
(snowflake IDs must never collide across nodes) and `NODE_ID`.

## What already works across nodes

| Concern | Mechanism |
| --- | --- |
| Room broadcasts (`message:created`, reactions, …) | Socket.io Redis adapter (`@socket.io/redis-adapter`): a room emit on any node reaches subscribers on all nodes. |
| Presence (`presence:update`, friend presence) | Presence keys live in Redis (`presence:<userId>`, TTL-refreshed). Cross-node *events* travel over the cross-node bus (`services/websocket/cross-node.bus.ts`, Redis pub/sub `crossnode:presence`): the originating node computes the fan-out targets once and every node re-emits to its local clients. |
| Typing indicators | Same cross-node bus (`crossnode:typing`). The 5s auto-stop timer is safe because a socket lives on exactly one node. |
| Auth | Stateless JWTs (RSA) — any node verifies any token; sessions in Postgres. |
| Snowflake IDs | `WORKER_ID` env (10 bits → up to 1024 nodes), 4096 ids/ms per node. |
| Ingestion pipeline | Producers publish to the `freedomtalk.events` topic exchange; workers consume with prefetch and retry/DLQ semantics — scale workers independently of API nodes. |
| Connection limits / abuse counters | Redis-backed. |

Per-connection rate limiting is intentionally in-memory: it bounds one
socket's event rate and a socket belongs to exactly one node. Nothing
needs a shared counter to do its job.

## Mediasoup (voice/video) scaling path

Each API node runs its own mediasoup workers and is a complete SFU for
the rooms that terminate on it. Media (RTP/SRTP) flows **directly between
clients and the node hosting their router** — it never traverses the
other node. What this means operationally:

1. **Small scale (current default):** room-to-node affinity by way of
   nginx `ip_hash` — everyone in a voice room usually lands on the same
   node. Voice state that must be visible everywhere (member lists) is
   synced through the same Redis paths as the rest of the app.
2. **Node sizing:** mediasoup spawns one worker per CPU core by default
   (`mediasoup.service`); voice capacity is roughly linear in cores.
   Reserve UDP `RTC_MIN_PORT`–`RTC_MAX_PORT` (default 40000–49999) and
   set `ANNOUNCED_IP` to the node's reachable IP — per node, behind the
   same firewall rules.
3. **Dedicated SFU tier:** when voice load outgrows the API nodes, run
   WS-only nodes (`packages/api/src/scripts/ws-node.ts` is the
   blueprint: real socket stack, no REST/mediasoup) plus dedicated
   "SFU nodes" that only host routers. Route a room to an SFU with a
   Redis registry (`room:<id> → node`) consulted by the voice handler's
   join; clients get `ip:port` from the registry entry and media flows
   straight to that node. No client changes needed — signaling still
   goes through Socket.io.
4. **Regional latency (later):** a registry entry per region + geo DNS;
   cross-region media always relays, so keep a room inside one region.

## The stateful tier

Scale Postgres/Redis/RabbitMQ vertically first; they are not the
interesting bottleneck at this scale. When they become one:

- **Postgres:** read replicas for history/pagination reads; TimescaleDB
  already partitions time-series data.
- **Redis:** Redis Cluster; the adapter and cross-node bus only need
  working pub/sub and key access.
- **RabbitMQ:** quorum queues + more workers (consumer scaling is the
  designed release valve — prefetch 16 per worker).

## Watching it work

- `deploy/grafana-dashboard.json` (auto-provisioned in the base compose)
  shows per-node WS connections, message rates, RabbitMQ queue depth and
  DLQ counters.
- The multi-node behavior is enforced by a test that runs **two real
  node processes** sharing only Redis/Postgres:
  `packages/api/src/services/websocket/__tests__/integration/multi-node.integration.test.ts`
  (presence and typing raised on node A must arrive on node B).
