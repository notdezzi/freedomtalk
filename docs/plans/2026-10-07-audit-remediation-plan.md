# FreedomTalk — Full Audit Remediation Plan (2026-10-07)

**Source:** `/impeccable audit` of 2026-10-07. Overall 10/20 (Acceptable); backend scored 1/4.
**Verdict:** Not deployable until Phase 1–2 (backend authorization) and the P0 frontend fixes land.

This plan fixes every P0–P3 finding from the audit. Phases are ordered so that security-critical
work lands first, frontend work second, and cleanup last. Each phase ends with a definition of
done. File references are to `packages/api/src` or `packages/web` unless noted.

**Governing rules for every phase**

1. One PR per workstream (not per finding) — findings within a phase share test scaffolding.
2. Every authz fix gets a negative-path test: the exact request that was exploitable must now 403/404.
3. No drive-by refactors. Dead-code deletion happens only in Phase 6.
4. Follow `docs/plans/2026-02-19-hierarchical-permission-system-design.md` for hierarchy semantics;
   the audit found the implementation does not match that doc — this plan converges on the doc.

---

## Phase 1 — P0 backend authorization (the message/search surface)

**Goal:** no authenticated user can read or write content they don't have permission for.

### 1.1 Membership is not enforced; non-members get @everyone permissions

- `services/permission/permission.service.ts:542-572` — `getMemberRolesSorted` unconditionally adds
  the @everyone role for any `userId` without checking `server_members`. Combined with default
  @everyone grants (`packages/shared/src/permissions.ts:134-143`), strangers get VIEW/SEND/HISTORY.
- Fix: in `getMemberRolesSorted`, first resolve membership; if the user is not a member, return
  `null` (or an explicit "no membership" sentinel) and have `hasChannelPermission` /
  `getUserChannelPermissions` short-circuit to deny for server channels. DM handling is separate
  and already participant-gated — do not touch it.
- Add a regression unit test: non-member userId on a server channel → `hasChannelPermission` false
  for every flag; member → defaults resolved as before.

### 1.2 Unscoped `GET /messages` dumps the whole platform (including DMs)

- `routes/messages/index.ts:230-262` — permission checks only run `if (channelId)`;
  `messageService.getMessages` (services/message/message.service.ts:389-469) otherwise returns
  everything with `is_deleted = false`.
- Fix (two layers):
  1. Route: make `channelId` **required** on `GET /messages`. Return 400 when absent. Delete the
     `authorId`/`search`/`startDate`/`endDate` cross-channel query modes from this route (global
     search belongs in `/search`, which gets its own fix in 1.5).
  2. Defense in depth: in `messageService.getMessages`, throw `ForbiddenError` if filters contain
     neither `channelId` nor `dmChannelId`.
- Test: `GET /messages` without channelId → 400; with a channelId of a server the caller isn't in → 403.

### 1.3 Any user can edit any message (no author check)

- `routes/messages/index.ts:321-329` → `messageService.updateMessage(id, content, userId)`; the
  service (message.service.ts:666-743) uses `editorId` only for the edit-history row.
- Fix:
  - Route-level: load the message first; for **server** messages require authorship OR
    `MANAGE_MESSAGES` on the parent channel (Discord semantics); for **DM** messages require
    authorship only (align with `routes/dm.routes.ts:480`).
  - Service-level: `updateMessage` accepts an `{ allowModerator: boolean }` option or is split into
    `editOwnMessage` / `moderateMessage`; never silently record someone else's edit without check.
- Include the server-channel moderator path in tests (moderator can edit, regular member cannot).

### 1.4 Single-message read and edit-history have no authz (IDOR)

- `GET /messages/:id` (routes/messages/index.ts:166-199) and `GET /messages/:id/history`
  (:410-443) go straight to bare DB lookups.
- Fix: shared helper `assertMessageReadAccess(userId, message)` used by both routes:
  - DM message (`dm_channel_id` set) → `isParticipant`.
  - Server message (`channel_id` set) → channel lookup → VIEW_CHANNEL + READ_MESSAGE_HISTORY.
  - Deleted-server orphaned messages (`channel_id` null after the `ON DELETE SET NULL` cascade —
    see Phase 5.6) → 404.
- Also fix the latent bug while here: DM-scoped routes compare `message.channel_id !== channelId`
  but DM messages store `dm_channel_id` (`routes/dm.routes.ts:429, 475, 526`) — those endpoints
  always 404. Correct the field and add tests.

### 1.5 Global search ignores permissions

- `routes/search/index.ts:48-56` passes no user context; `search.service.ts:87-118` filters only
  `is_deleted = false`.
- Fix: search requests must carry an authorization scope. Concretely:
  - Resolve the caller's server memberships once per request.
  - Post-filter Meilisearch hits server-side by (channelId ∈ channels the user can view) or
    (dmChannelId ∈ DMs where user is participant). Given potentially large result sets, prefer
    adding a `serverId IN (...)` filter to the Meilisearch query itself (the indexers already
    store server context — verify `message.indexer.ts` fields; add `dm_participants` or exclude
    DM rows from the global index and index them in a separate per-DM filter if needed).
  - Simplest correct v1: **exclude DM messages from the searchable index entirely** and filter
    server hits by membership. Document the limitation.
- Test: user not in server B never receives hits from server B or any DM.

### 1.6 Role update/delete is cross-server IDOR + self-grantable ADMINISTRATOR

- `routes/servers/index.ts:1552-1573, 1616-1621` pass only `roleId`;
  `role.service.ts:170-238, 243-261` never verify `role.server_id === serverId`;
  `validateRolePermissions` (:326-338) only range-checks bits; no hierarchy checks.
- Fix:
  - Service methods take `serverId` and 404 on `role.server_id !== serverId` (apply to update,
    delete, and any reorder endpoints).
  - `validateRolePermissions` strips/Rejects `ADMINISTRATOR` unless the acting user has
    ADMINISTRATOR (Discord semantics) or is owner.
  - Enforce role hierarchy from the design doc: acting user's highest role position must exceed
    the target role's position for update/delete/assign.
- Tests: cross-server 404; non-admin granting ADMINISTRATOR → 403; lower-position mod editing
  higher-position role → 403.

### 1.7 `trustProxy` absent → shared rate-limit bucket behind the proxy

- `api/src/index.ts:31-48`, `app.ts:30-47` ignore `X-Forwarded-For` set by
  `deploy/nginx/nginx-scale.conf:16-30`; all clients share the global 100 req/min bucket and the
  login 5/15min bucket (mass lockout + trivial API DoS). In-memory store also splits counts
  per-instance.
- Fix:
  - Read `TRUST_PROXY` from env; when set, enable trust-proxy so `request.ip` is the client IP.
  - Move the rate-limit store to Redis (the project already has Redis) so limits are shared across
    instances; keep in-memory fallback for dev.
  - Document `TRUST_PROXY` in `.env.example` and `docs/deploy.md`.
- Test: integration test asserting two requests with different `X-Forwarded-For` values get
  independent buckets when trust-proxy is on.

### 1.8 Refresh tokens accepted as access tokens

- `verifyToken()` (`services/auth/jwt.service.ts:97-120`) never checks `payload.type`;
  `middleware/auth.middleware.ts:107` and the WS handshake
  (`services/websocket/auth.middleware.ts:109`) don't either. Refresh route checks
  `type !== 'refresh'` only (`routes/auth/index.ts:414`).
- Fix: `verifyToken(payload, expectedType)` — `requireAuth` passes `'access'`, WS handshake passes
  `'access'`, refresh route passes `'refresh'`. Mint tokens with the `type` claim (verify it's
  already set; if not, add it at signing time).
- Test: use a refresh token as Bearer on `GET /users/@me` → 401.

**Definition of done (Phase 1)**
- All new negative tests green; existing route tests updated and green.
- Manual curl checklist (kept in the PR description) shows 403/404 for each previously exploitable request.
- `docker-compose.test.yml` suite passes; no perf regression on message list route (single extra
  membership query is acceptable; batch if the route hot-path shows >1 extra query).

---

## Phase 2 — P1 backend: moderation, voice, attachments, invites

### 2.1 Reactions: zero visibility checks

- `routes/reactions.routes.ts:113-179` → `reactionService.addReaction`
  (services/reaction/reaction.service.ts:63-137) checks only existence/duplicates/20-cap; reactors
  of any DM are enumerable via :366-497.
- Fix: same `assertMessageReadAccess` helper from 1.4 applied to add/remove/list-reactors routes.
  Remove the mitigation-by-rate-limit comment; rate limit stays as anti-spam, not authz.

### 2.2 Attachments: arbitrary-object presigned URLs, no ownership

- `POST /messages/:messageId/attachments` (routes/attachments.routes.ts:170-306) accepts attacker
  `objectPath` strings and presigns them; `GET .../attachments` (:312-343) has no authz.
- Fix:
  - Upload flow: presign a **server-chosen** object path (`attachmentService.generateObjectPath`
    with the *caller's* userId) and return (objectPath, uploadUrl) — the client never dictates the
    path. Attach endpoint then verifies `objectPath.startsWith('attachments/<callerUserId>/')`
    before attaching to a message the caller authored.
  - Read flow: `assertMessageReadAccess` before returning attachment metadata or presigned GETs.
- Tests: presign request for another user's path → 403; attach to someone else's message → 403.

### 2.3 Pin/unpin skips checks for DM messages

- `routes/messages/index.ts:476-496, 529-543` check `PIN_MESSAGES` only `if (message.channel_id)`.
- Fix: DM branch → `isParticipant` + author-or-any-participant policy (match DM edit/delete
  semantics: Discord allows any DM participant to pin). Route through `assertMessageReadAccess`
  first.

### 2.4 Member role assignment: hierarchy, server binding, owner protection

- `PUT /servers/:serverId/members/:userId/roles` (routes/servers/index.ts:974-1010) →
  `serverMemberService.setRoles` (services/server/server-member.service.ts:453-473) inserts
  arbitrary roleIds with no ownership/hierarchy checks.
- Fix: reject roleIds not belonging to `serverId`; apply the 1.6 hierarchy rule; block modifying
  roles of the owner; block self-elevation beyond acting position. Same rules for kick/ban
  targets (`server-member.service.ts:176-177`, `server-ban.service.ts:74-75` currently allow
  targeting the owner — the doc calls it intentional, but combined with 1.6 it is takeover;
  re-enable owner-targeting only once hierarchy is enforced).

### 2.5 Kick/ban not enforced on live websocket sessions

- Ban/kick emit `SERVER_REMOVE` only (server-ban.service.ts:146-149,
  server-member.service.ts:211-214); no `socketsLeave` anywhere; rooms validated only at join
  (room.handler.ts:63-118).
- Fix: in the kick/ban service paths, after emitting, call through to the websocket layer
  (`io.in('server:<id>').socketsLeave(...)` for the target user's sockets — resolve socket ids via
  the connection manager's user index, not a global room kick). Also re-check membership in the
  message broadcast path (message.broadcaster.ts) as defense in depth: skip sockets whose user is
  no longer a member. This closes Layer 3 of
  `docs/plans/2026-02-20-realtime-permissions-fix-design.md`.
- Test: banned user's live socket stops receiving `message:created` for that server without reconnect.

### 2.6 Voice: admin operations never touch the media session

- `routes/voice/index.ts:420-559` (kick/mute/deafen/move) only mutate `voice_states` rows; the file
  never imports `mediasoupService`; no socket event notifies the target.
- Fix:
  - Server mute/deafen: call `mediasoupService.setParticipantSuppress(sessionId, flag)` which
    pauses (`producer.pause()`) / resumes the participant's audio producers and closes their video
    producers when deafened. Include `suppress`/`deaf` in the `existingUsers` payload
    (voice.handler.ts:119-131) and in `voice:update` broadcasts so clients render state.
  - Server kick: close the participant's transports (`mediasoupService.removeParticipant`) and emit
    `voice:force_disconnect` to the target's socket; client closes the call UI on receipt.
  - Move: emit `voice:move` with the target channel; client performs leave+join. Server-side also
    re-verify CONNECT on the destination before applying the DB move.
- Tests: unit-test the service wiring; manual two-browser test for mute/kick (audio actually stops).

### 2.7 DM calls bypass blocks/privacy/friend gates

- `voice.handler.ts:83-88, 151-166` checks only `isParticipant`; `canSendDM`/`checkPrivacyLevel`
  (dm-permission.service.ts:36-153) has **zero call sites**.
- Fix: call `dmPermissionService.canSendDM(callerId, calleeId)` (or the block+privacy subset) at
  the top of the DM branch of `voice:join`/call-start; return `DM_BLOCKED` / `DM_DISABLED` error
  codes. Wire the same check into the WS DM message handler (message.handler.ts:80-89) so
  blocked users can't DM via socket either, and into REST DM create (`routes/dm.routes.ts:85-90`).
- Tests: blocked user ring → error event; stranger with privacy "friends only" → error.

### 2.8 Mediasoup leaks and scale

- **Channel-switch leak:** `voice:join` overwrites `socketSessions` without removing the old
  session's participant (voice.handler.ts:103, 109-110 vs 446-470); leaked participants keep rooms
  alive forever (mediasoup.service.ts:311-314). Fix: at the top of the DM/server join branch, look
  up any existing session for the socket (or user+guild pair) and run the same cleanup the
  disconnect path runs before creating the new one.
- **Cross-node media broken:** node-local room Map (mediasoup.service.ts:104) + `ip_hash`
  (nginx-scale.conf:9-13). Fix (pragmatic v1): route voice signaling to a consistent node — add a
  Redis-backed "voice channel → owning node" registry: first node to host a channel wins; all
  signaling for that channel is proxied/forwarded to the owner node via the existing cross-node
  bus; document that v1 uses sticky channel ownership. (Full multi-host SFU is a roadmap item, not
  a fix — keep scope here to correctness at 2 nodes.)
- **DM voice-state accumulation** (voice-state.service.ts:60-64, 111-115): extend dedupe/move logic
  to `serverId IS NULL` rows keyed by `dm_channel_id + user_id`; add a startup/cron reaper that
  deletes voice states whose session has no live socket (reuse connection manager's user index).
- **`voice:*` / `dm_channel:*` rate limits** (handlers/index.ts:142-145): add voice event limits to
  `DEFAULT_EVENT_LIMITS` (rate-limiter.ts:50-53) and wrap the two handlers with
  `onRateLimitedEvent` like message/room/presence.

**Definition of done (Phase 2)**
- Negative-path tests for 2.1–2.5, 2.7 green.
- Two-browser manual QA script (in PR description) demonstrates: server mute silences audio, kick
  drops the call, blocked user cannot ring, channel switch leaves no zombie participant (verify via
  mediasoup room stats log line).
- Load k6 voice-signaling probe (`load/k6/voice-signaling.js`) still passes.

---

## Phase 3 — P0 frontend: unblock non-mouse users, phones, and the socket cache

### 3.1 Message actions are hover-only

- `components/messaging/message-item.tsx:72-73, 99-109, 120-121, 225-235` — actions render only on
  `onMouseEnter/Leave`; keyboard/touch users can never edit/delete/reply/react/pin.
- Fix: always render the actions row into the DOM; toggle *visibility* with CSS
  (`opacity-0 group-hover:opacity-100 focus-within:opacity-100`), plus:
  - Focus the message row (tabIndex=0) so focus-within reveals actions; Enter opens a fallback
    action menu for keyboard users (reuse `common/context-menu.tsx` which already has
    `role="menu"`).
  - Long-press (pointer events) on touch opens the same menu; CSS hover states become irrelevant
    on touch.
- Accept: every message action reachable by keyboard alone; verified with the tab-only manual pass.

### 3.2 ARIA for voice & messaging controls

- Zero `aria-` attributes in `components/voice/**` and `components/messaging/**`.
- Fix (systemic, one sweep):
  - All icon-only buttons get `aria-label` (reuse the existing tooltip title text) and, for toggle
    controls (mute/video/screenshare/deafen), `aria-pressed`.
  - `ui/tooltip.tsx:76-107`: generate an id, set `aria-describedby` on the trigger, and pass
    through `aria-label` props (`message-item.tsx:279-290` buttons become labelled).
  - Incoming-call notification (`voice/incoming-call-notification.tsx:95-153`): render as
    `role="alertdialog"` `aria-modal="false"`, `aria-label` on dismiss X, and move focus to it on
    mount (restore on dismiss).
  - Reaction picker (`reaction-picker.tsx:104-136`): `role="dialog"`, category tabs with
    `role="tab"`/`aria-selected`, labelled search input.
  - Category collapse buttons (`navigation/item-list.tsx:225-257`) get `aria-expanded`; replace the
    clickable `<Plus>` SVG (lines 249-255) with a real `<button aria-label="Create channel">`.
- Accept: axe DevTools run on channel view, DM view, voice panel, incoming call → 0 critical violations.

### 3.3 Mobile layout for the app shell

- `components/layout/app-shell.tsx:29-45` fixed 30%/25% columns; no breakpoints anywhere.
- Fix (single system, applied once):
  - `<768px`: server rail stays (72px → 56px), navigation column becomes an overlay drawer
    (existing `ui-store` sidebar state can drive it), members column hidden behind a header
    toggle. Chat takes full width.
  - `768-1200px`: members column collapses to icon-optional narrow state; nav column narrows to
    240px min.
  - Replace `h-screen` with `h-dvh` (app-shell.tsx:24).
  - Voice grids: switch inline `gridTemplateColumns` counts (video-grid.tsx:67-74,
    voice-grid-view.tsx:68,108) to `repeat(auto-fit, minmax(160px, 1fr))` with container queries or
    a small `useContainerWidth` hook.
  - Server-settings modal: drop fixed `h-[500px]` (index.tsx:116) for `h-[min(80dvh,640px)]`; fix
    the 560px-min members-tab split (members-tab.tsx:145-156) to stack under 640px.
- Reordering on touch: replace HTML5 drag in `icon-list.tsx:49-95` and
  `navigation-column.tsx:188-410` with the dnd-kit pattern already proven in `role-list.tsx`
  (KeyboardSensor + `touch-none` handle) — one shared `useSortableList` hook for servers, channels, DMs.
- Touch targets: raise action buttons/emoji/reaction targets to ≥44px hit areas
  (`user-panel.tsx:57-84`, `message-item.tsx:283`, `reaction-picker.tsx:95,130`) using padding
  expansion rather than visual size change.
- Accept: 375px and 768px Playwright screenshots of channel, DM, voice, settings pages show no
  overflow and reachable chat input.

### 3.4 Socket-driven cache updates (kill the refetch storm)

- Every socket event invalidates the whole infinite query (hooks/use-socket.ts:85-132, 318-334);
  sending double-invalidates (features/channels/api.ts:117-122); no optimistic updates anywhere.
- Fix:
  - `message:created` → `queryClient.setQueryData` append to the matching infinite page (or last
    page) for the channel; `message:updated`/`message:deleted` → in-place patch; `reaction:*` →
    patch the message's reaction list (handle DM channels too — currently ignored entirely).
  - Send path: optimistic insert with a temp id, replaced by the socket echo (dedupe on
    `clientMessageId` if present, else on author+content+time window); remove the mutation-side
    invalidation.
  - Keep invalidation as fallback only for `resync` / reconnect events.
- Also wire the never-used `TYPING_TIMEOUT` (stores/typing-store.ts:23) and fix the fresh-`[]`
  selector (typing-store.ts:82) — return a stable `EMPTY_ARRAY` constant.
- Accept: sending a message produces **zero** additional HTTP requests in the network tab;
  receiving one in an idle channel produces zero.

### 3.5 Fake/dead flows → real or removed

- `join-server-modal.tsx:31-52` fakes preview+join while real APIs exist (`lib/api-client.ts:610-624`).
  Wire to `previewInvite` / `joinServer` with loading, error (invalid/expired/banned), and success
  (navigate to server) states.
- Add Friend: `openModal('add-friend')` has no renderer case (modal-renderer.tsx:20-90). Build the
  add-friend modal on the existing friends API (the friends page at `app/app/page.tsx` already
  wires real endpoints to copy patterns from), or remove the "+" button until built. Decision:
  **build it** — the API and patterns exist; missing modal types (pinned-messages, search,
  leave-server, channel-settings) get explicit "not wired" tracking instead of silent no-ops.
- Attachment upload: implement the upload flow end-to-end — `message-input.tsx` already collects
  files; call the fixed Phase 2.2 endpoints (presign → PUT → attach), show progress and errors.
  This depends on Phase 2.2 landing first.

**Definition of done (Phase 3)**
- Keyboard-only pass: send, edit, delete, react, pin, reply, join server, add friend — all completable.
- Playwright: mobile-viewport e2e for send-message and join-server-by-invite.
- Network-tab assertions from 3.4 documented in the PR.

---

## Phase 4 — P1 frontend: performance & a11y gaps

### 4.1 Render performance
- `React.memo` on `MessageItem`, `ReactionBadge`, `MarkdownContent` (memoize markdown parse by
  content string). Memoize `groupMessages` output keyed on the message array identity
  (message-view.tsx:67, 208-235); move the `useMemo` scroll side effect (message-view.tsx:87-98)
  into `useEffect`.
- Selector-based Zustand: replace wholesale `useVoiceStore()` subscriptions
  (navigation-column.tsx:35, hooks/use-voice-connection.ts:21-33, use-server-voice-states.ts:32-40)
  with narrow selectors; fix the O(n²) channel lookups (navigation-column.tsx:700-714, 805-827)
  with a precomputed `Map<channelId, channel>` memo.
- Move hover state in `message-item.tsx` to CSS (done in 3.1) — removes per-row state churn.
- Fix `key={index}` on reaction badges (message-item.tsx:92, 199-208) → key by `emoji`.

### 4.2 Bundle
- `next/dynamic` for all 11 modals in `modal-renderer.tsx:4-14` (server-settings is the big one).
- Lazy-load `react-markdown`/`remark-gfm` is unnecessary once memoized, but switch code
  highlighting in `markdown-content.tsx` to a dynamic import.
- Remove the 13 unused production deps (`axios`, `react-hook-form`, `@hookform/resolvers`, `zod`
  [if unused in web], `emoji-picker-react`, `highlight.js`, `rehype-highlight`, `sharp`, `minio`,
  `nodemailer`, `@fastify/swagger-ui`, `vitest`, `@vitest/ui`) from `packages/web/package.json`.
- Raw `<img>` → `next/image` for avatars with `loading="lazy"` and fixed dimensions
  (ui/avatar.tsx:62-66 and 11 others).

### 4.3 Remaining a11y/responsive P1s
- Dropdown: convert `ui/dropdown.tsx:79` trigger from `<div onClick>` to button composition with
  `aria-haspopup`/`aria-expanded`; add `role="menu"`/`menuitem` and arrow-key nav (align the two
  implementations — see 6.2).
- Context menus (both): arrow-key navigation + focus into menu on open + restore on close
  (ui/context-menu.tsx:73-118, common/context-menu.tsx:67-83).
- Contrast: bump `--placeholder` (#72767d → ≥4.5:1 on `#313338`, e.g. #8a919c) and lift
  `--foreground-subtle` one step (globals.css:29-30); re-check the 10px timestamps
  (message-item.tsx:77).
- Reduced motion: extend the globals.css kill-switch (globals.css:489-507) to Tailwind's
  `animate-bounce/ping/pulse/spin` via a shared rule; typing indicator and incoming-call pings
  get static alternatives.
- Replace layout-property animations: `message-delete` max-height/margin/padding keyframes
  (globals.css:348-360) → grid-template-rows or transform/opacity; app-shell width transition
  (app-shell.tsx:36-37) → transform-based drawer.

**Definition of done (Phase 4)**
- Long channel (500+ messages) scroll + new-message test shows no full-list re-render (React
  Profiler recording attached to PR).
- axe clean; contrast tokens verified with a computed-ratio script check.

---

## Phase 5 — P2 backend hardening

5.1 **Invites:** wrap `useInvite` + `addMember` in one transaction with `SELECT ... FOR UPDATE`
   (invite.service.ts:315-338; routes/servers/index.ts:627-643) so failed joins don't burn uses and
   concurrent joins can't exceed max_uses. Replace `Math.random()` code generation with
   `crypto.randomBytes` (invite.service.ts:71-78). Add a dedicated limiter on `/servers/join` and
   invite preview.
5.2 **Discovery/vanity leaks:** `/discovery/servers/:id/preview` must check `is_discoverable`
   (routes/discovery/index.ts:125-224); `/servers/:id/vanity` + `vanity/check`
   (routes/servers/index.ts:525-598) require server membership; `GET /channels/:id/webhooks`
   (webhooks.routes.ts:116-139) requires the same permission as webhook CRUD.
5.3 **Transactions:** role delete (role.service.ts:254-260), kick member+roles+decrement
   (server-member.service.ts:188-203), message update history+update (message.service.ts:699-709).
5.4 **Orphaned messages:** change `messages.channel_id` cascade to `ON DELETE CASCADE` (migration),
   or clean up in `deleteServer` — decide by which preserves audit needs; either way the Phase 1.4
   404-for-orphans rule stays.
5.5 **Webhook execution** is broken (passes `webhook.id` as author into the users-table check,
   webhook.service.ts:209-213 → message.service.ts:230-233): add a system/author bypass for
   webhook-sourced creates.
5.6 **MFA:** wire setup/enable/disable/verify routes (services exist, zero routes) with Zod
   schemas; store `last_used_at` per TOTP window to prevent replay (mfa.service.ts:145-158);
   bump backup codes to ≥128 bits (currently 32, mfa.service.ts:296-300) and make consumption
   atomic (`UPDATE ... WHERE code = X AND used = false`).
5.7 **Logging hygiene:** stop logging request bodies at info level (validation.middleware.ts:20);
   add a redact list for password/token fields as defense in depth.
5.8 **Enumeration:** unify register 409s into one generic message with field-level hints removed
   (routes/auth/index.ts:99-108); add dummy-bcrypt compare on unknown login email (:218-221).
5.9 **Password policy:** call `validatePasswordStrength` on register and reset-password
   (routes/auth/index.ts:54, 574-614); add Zod schema to reset body (currently unvalidated) and to
   `/mfa/verify` (null body 500s at :291-296).
5.10 **Socket hygiene:** re-validate auth on a 5-min interval per connection or on privileged
    events (auth is handshake-only, auth.middleware.ts:50-52); drop the `?token=` query fallback
    (keep header/subprotocol only); rate-limit `typing:start` with membership validation
    (presence.handler.ts:132-141 + typing.manager.ts:155-193) and evict `lastTypingTime` entries.
5.11 **Reconnect/replay:** on reconnect, re-emit `room:join` per subscribed channel from the
    client (fix `syncSubscriptions` ownership-only gap, subscription.manager.ts:112-117); v1
    replay = client refetch of messages since last seen id (no server buffer needed).
5.12 **Cookie/CSRF:** either remove the `access_token` cookie auth path (auth.middleware.ts:50-54)
    or register the existing-but-dead CSRF middleware on cookie-authenticated routes; fail-fast on
    missing `COOKIE_SECRET` in production (app.ts:62, index.ts:67).
5.13 **Env toggles:** `SKIP_RATE_LIMIT` must be ignored when `NODE_ENV=production`
    (routes/auth/index.ts:23-35); Swagger behind `SWAGGER_ENABLED === 'true'` by default
    (index.ts:76).
5.14 **OAuth linking:** require verified email before linking to an existing account and check
    `account_status` in both callbacks (routes/auth/index.ts:769-841, 886-958).
5.15 **Email verification:** hash verification tokens at rest like reset tokens
    (email-verification.service.ts:61-67); fix or remove the broken service-level limiter (:44-50).

## Phase 6 — P2/P3 frontend + dead-code pass

6.1 **Theme:** decide — implement light theme properly (token block + settings entry + testing) or
   delete `theme`/`toggleTheme` from `stores/ui-store.ts:52-54, 89-93`. Recommendation: delete now,
   re-add with a designed light palette later (dark-only is coherent; a broken toggle is not).
6.2 **Merge duplicate context menus** into `common/context-menu.tsx` (it has the better a11y):
   port the `position`-based API users, delete `ui/context-menu.tsx`, update
   navigation-column.tsx:9 and members-column.tsx:11.
6.3 **Dead stores/features:** remove `socket-store` queue (never used, `setSocket` never called),
   unused ui-store contextMenu state, `useAnnounce` + skip-link CSS — or wire the skip link (it's
   one line in the shell; wire it). Add DM reaction socket handlers to mirror channel ones.
6.4 **401 handling:** response interceptor in `lib/api-client.ts:287-365` → single-flight refresh
   via `refreshTokens()` (lines 406-430) then retry; on refresh failure, clear tokens and redirect
   to login. Decide token storage: keep localStorage but document XSS tradeoff, or move refresh to
   httpOnly cookie (API cookie utilities already exist) — recommend the cookie move as its own PR.
6.5 **Consistency cleanups:** status colors through tokens (`lib/utils.ts:97-110`), stray
   hexes (`voice-panel.tsx:56`, `navigation-column.tsx:106, 909`), `text-red-400`-style raw
   palette in shared UI → token classes.
6.6 **Client voice resilience:** device-change/track-ended listeners, ICE connection-state
   monitoring with auto-rejoin, permission-denial recovery; DM "Decline" must emit a reject signal
   to the caller (incoming-call-notification.tsx:83-85 currently only hides UI).
6.7 **Detector advisories:** off-ramp font sizes on `sfu/page.tsx` (debug page — decide whether it
   ships; recommend gating behind an env flag), `#99aab5` in profile-panel → token.
   Detector "side-tab" warnings on blockquote/mention borders and bounce-easing on
   typing-indicator are **accepted false positives** (Discord-conventional idioms) — record as
   ignored rules.
6.8 **Tests:** voice route tests assert behavior, not structure
   (routes/voice/__tests__/voice.routes.test.ts:17-84) — add the CONNECT/ban/session-ownership
   negative paths.

## Phase 7 — Verification & sign-off

1. Full suite: `npm run test:unit` (API), `SKIP_RATE_LIMIT=true npx playwright test` (e2e), k6 probes.
2. Security regression checklist: every Phase 1–2 negative test re-run against a deployed
   docker-compose stack.
3. a11y: axe on 6 key screens (landing, login, channel, DM, voice, settings) — 0 criticals.
4. Responsive: 375/768/1440 screenshots across the 6 screens.
5. Perf: network-tab assertion (no refetch storms), React Profiler recording, bundle diff report.
6. Re-run `/impeccable audit` — target ≥16/20.

---

## Sequencing & dependencies

```
Phase 1 (authz core)  ──►  Phase 2 (moderation/voice)  ──►  Phase 5 (P2 backend)
        │                                                        │
        └──►  Phase 3 (frontend P0; 3.5-attachments waits on 2.2) └──► Phase 6 ──► Phase 7
                    └──►  Phase 4 (perf/a11y)
```

- Phases 1 and 3 can run in parallel (different packages).
- Phase 3.5 (attachment upload) depends on Phase 2.2.
- Phase 7 gates release.

**Suggested PR slicing:** (1) P1 authz core, (2) P2 backend, (3) P1 roles/invites/etc. backend,
(4) P3 socket cache, (5) P3 a11y, (6) P3 mobile, (7) P4 perf, (8) P5 backend hardening,
(9) P6 frontend hardening, (10) P7 cleanup + tests.

**Risks**
- Making `channelId` mandatory on `GET /messages` can break unknown consumers — grep the web app
  and k6 scripts for unscoped calls before merging (audit found none, verify anyway).
- `ON DELETE CASCADE` migration (5.4) is irreversible-ish; back up `messages` first
  (`npm run backup:db`).
- Redis-backed rate limits change failure semantics — if Redis is down, fail **closed** for auth
  routes, **open** for general traffic (documented in 1.7).
- dnd-kit migration (3.3) touches drag UX users know; keep keyboard shortcuts identical to
  role-list behavior.

**Filed as beads issues:** create one `bd` epic per phase on branch-out, with child issues per
numbered fix, linked `discovered-from` the audit session.
