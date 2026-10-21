# Production Deployment Runbook (docker-compose.prod.yml)

One-command production stack: **Caddy** (HTTPS reverse proxy) → **web** (Next.js) +
**api** (Fastify/Socket.IO/mediasoup) + **worker**, backed by **postgres** (TimescaleDB),
**redis**, **rabbitmq**, **minio**, **meilisearch**. Only ports 80/443 (TCP+UDP for HTTP/3)
and mediasoup's UDP 40000–49999 are exposed on the host.

## Prerequisites

- VPS: 2 vCPU / 4 GB RAM minimum (mediasoup workers need headroom), 20+ GB disk.
- Docker Engine 24+ with the Compose v2 plugin (`docker compose version`).
  Compose v2 is required (the file uses YAML merge keys and nested `${VAR:-${DOMAIN}}` defaults).
- A domain with an A/AAAA record pointing at the VPS. Let's Encrypt certs are
  issued automatically by Caddy; ports 80 and 443 must be reachable.
- Open in the firewall / cloud security group: **80/tcp, 443/tcp, 443/udp,
  40000–40100/udp** (WebRTC media — see below; widen with `MEDIASOUP_RTC_MIN_PORT`
  / `MEDIASOUP_RTC_MAX_PORT` if you need more concurrent voice).

## 1. Configure environment

The compose file reads a `.env` file from the repo root (same dir as
`docker-compose.prod.yml`). Start from `packages/api/.env.example` and set at least:

```bash
cp packages/api/.env.example .env
```

**Required — the stack refuses to start without these:**

| Variable | How to generate / notes |
| --- | --- |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | RS256 PEM pair. `node -e "const c=require('crypto');const {publicKey,privateKey}=c.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});console.log(privateKey);console.log(publicKey)"` — paste on ONE line with **literal `\n`** between PEM lines (`-----BEGIN PRIVATE KEY-----\nMII...`). `packages/api/src/services/auth/jwt.service.ts` unescapes `\n` itself, so keep them literal. |
| `SESSION_ENCRYPTION_KEY` | 32-byte hex: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `COOKIE_ENCRYPTION_KEY` | same as above (use a different value) |
| `COOKIE_SECRET` | `openssl rand -hex 32` |
| `MEILI_MASTER_KEY` | min 16 chars (Meilisearch runs with `MEILI_ENV=production` here): `openssl rand -hex 24` |
| `MINIO_ROOT_PASSWORD` | min 8 chars; `MINIO_ROOT_USER` defaults to `minioadmin` |
| `MEDIASOUP_ANNOUNCED_IP` | the VPS **public IPv4**. Never `127.0.0.1` — clients receive it in ICE candidates (`packages/api/src/services/voice/mediasoup.service.ts`). |

**Strongly recommended overrides** (defaults are dev-grade): `DOMAIN` (e.g.
`chat.example.com` — drives the Caddy site address, CORS and the client's
`NEXT_PUBLIC_*` URLs), `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, `CORS_ORIGIN`,
`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` (default to `https://$DOMAIN`).
Set `EMAIL_SERVICE=smtp` + `SMTP_*` for real emails; OAuth `GOOGLE_*`/`GITHUB_*`
if used. `SWAGGER_ENABLED` is forced off by default in prod.

## 2. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps      # wait until everything is (healthy)
docker compose -f docker-compose.prod.yml logs -f api caddy
```

Service startup order is enforced with `depends_on: condition: service_healthy`
(infra → api/worker → web → caddy). Caddy proxies `/api/*` and `/socket.io*`
(websocket upgrade included) to `api:3000`, everything else to `web:3000`
(`deploy/caddy/Caddyfile`).

> **Note:** the prod stack intentionally reuses the same project name, container
> names, and named volumes as the dev `docker-compose.yml` (data continuity if
> you promoted a dev box). That means the dev stack must be stopped first —
> `docker compose down` — or container names will collide.

## 3. Run initial migrations

`knexfile.ts` and `migrations/` are TypeScript and are **not** in the slim runtime
image, so run migrations from a container of the *build stage* (has ts-node +
sources), attached to the stack network:

```bash
docker build --target build -t freedomtalk-api-build -f Dockerfile.api .
docker run --rm --network freedomtalk_network \
  --env-file .env -e NODE_ENV=production \
  freedomtalk-api-build \
  npx knex migrate:latest --knexfile knexfile.ts
# optional seeds:
#   ... npx knex seed:run --knexfile knexfile.ts
```

Alternative (no extra image): from a dev checkout with an SSH tunnel to the DB
(`ssh -L 5432:localhost:5432 vps`), run
`DATABASE_URL=... npm run migrate:latest --workspace=@freedomtalk/api`.

Verify: `docker run --rm --network freedomtalk_network --env-file .env -e NODE_ENV=production freedomtalk-api-build npx knex migrate:status --knexfile knexfile.ts`

## 4. Things that MUST be true in production

- **All secrets from step 1 overridden.** Nothing here should still be a dev default.
- **HTTPS is mandatory for voice.** `getUserMedia` (microphone) only exists in a
  secure context — `http://<ip>` will not get mic permission, so WebRTC calls
  fail outside `https://` (or `localhost`). Caddy gives you HTTPS automatically;
  just set `DOMAIN` and point DNS.
- **mediasoup UDP range.** The API opens RTC ports `MEDIASOUP_RTC_MIN_PORT`–
  `MEDIASOUP_RTC_MAX_PORT` (**40000–40100 by default**) and the compose file maps
  them 1:1 to the host using the same env vars — widen by setting both (plus the
  firewall rule). The default is deliberately small because Compose creates one
  docker-proxy mapping per published port; ~100 ports supports ~100 concurrent
  voice participants. If you need thousands, consider `network_mode: host` for
  the api service (Linux) instead of widening the range. The firewall must allow
  the UDP range, and `MEDIASOUP_ANNOUNCED_IP` must be the host's public IP or
  clients can't connect their media. More concurrent calls ⇒ also raise
  `MEDIASOUP_WORKERS` (2 workers ≈ a handful of simultaneous talkers on 2 vCPU).
- **Backups:**
  - Postgres (TimescaleDB): `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres freedomtalk | gzip > backup-$(date +%F).sql.gz`
    (restore with `gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U postgres freedomtalk`).
  - MinIO/attachments: `docker run --rm --network freedomtalk_network -v ~/.mc:/root/.mc minio/mc mirror alias/bucket /backup/attachments`
    (`mc alias set` once against `http://minio:9000` with `MINIO_ROOT_USER/PASSWORD`).
  - Meilisearch (optional): `docker compose exec meilisearch meilisearch --dump-dir /data/dumps` or copy the `meilisearch_data` volume.
- **Updates:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`,
  then re-run the migrate command from step 3.

## 5. Smoke-test checklist

1. `curl -s https://$DOMAIN/health` returns ok (proxied to the API); browser loads `https://$DOMAIN` over valid TLS (no warning).
2. Register two accounts; confirm redirect to onboarding → app.
3. Create a server → default `general` text + `General` voice channel appear.
4. Send a chat message; it appears for the second account in the same channel.
5. Invite the second account (`Invite People` → `Quick Create` → open the invite link) and both click the **General** voice channel: both browsers show "2 users", usernames in the participant list; `Disconnect`/`Leave Voice` removes the user for the peer.
6. Attach an image to a message (exercises MinIO); full-text search returns the message (exercises Meilisearch).
7. `docker compose -f docker-compose.prod.yml logs worker` shows the worker consuming jobs (mentions/search indexing).

## Troubleshooting

- **Voice connects but no audio:** `MEDIASOUP_ANNOUNCED_IP` wrong or UDP 40000–49999 blocked. Check with `docker compose logs api | grep -i mediasoup`.
- **Certs not issued:** DNS not pointing at the host, or port 80 blocked (ACME HTTP-01). `docker compose logs caddy`.
- **api restart loop:** usually a missing/short secret — the JWT service and session service fail fast on bad keys; check `docker compose logs api` for the exact message.
