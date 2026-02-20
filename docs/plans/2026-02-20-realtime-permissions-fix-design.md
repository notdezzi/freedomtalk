# Realtime Updates & Permissions Fix Design

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Fix realtime memberlist, server list, permissions, access control, and UI issues

## Overview

This design addresses multiple interrelated issues in FreedomTalk:
- Server memberlist not updating in realtime
- Server list not updating when users are kicked/banned/leave
- Permission system not working (roles not applied)
- Non-members can access server resources
- DM voice calls accessible by non-participants
- Memberlist missing role grouping and colors
- Channels in categories can't be dragged
- Text styling (markdown) not working

## Architecture

Fix in 4 layers, bottom-up:

```
┌─────────────────────────────────────────────────┐
│  Layer 4: UI Layer                              │
│  - Memberlist role grouping & colors            │
│  - Channel drag-and-drop                        │
│  - Markdown rendering (react-markdown)          │
├─────────────────────────────────────────────────┤
│  Layer 3: Realtime Events Layer                 │
│  - Server member events (join/leave/kick/ban)   │
│  - Server list updates                          │
│  - Permission-based broadcasting                │
├─────────────────────────────────────────────────┤
│  Layer 2: Access Control Layer                  │
│  - Block non-members from server access         │
│  - DM voice call security                       │
│  - Channel VIEW_CHANNEL enforcement             │
├─────────────────────────────────────────────────┤
│  Layer 1: Permission Layer (Foundation)         │
│  - Fix role application to members              │
│  - Enforce permissions on all routes            │
│  - Owner role handling                          │
└─────────────────────────────────────────────────┘
```

---

## Layer 1: Permission Layer (Foundation)

### Problem
Roles are not being applied to users. Permissions exist in code but aren't enforced.

### Root Causes
1. Member roles may not be fetched/joined properly in queries
2. Permission middleware not applied consistently to routes
3. Channel overwrites not being checked for VIEW_CHANNEL

### Fixes

#### 1.1 Ensure roles are fetched with members
- Update member queries to include roles with proper joins
- Verify `server_member_roles` table is being populated when roles are assigned

#### 1.2 Apply permission middleware to routes
- Add `requireServerPermission` / `requireChannelPermission` to routes that lack them
- Key routes needing fixes: message routes, channel routes, voice routes

#### 1.3 Fix VIEW_CHANNEL enforcement
- Channel routes already have `requireChannelPermission(VIEW_CHANNEL)` but may not be working
- Debug the permission resolution to ensure it's checking channel overwrites

#### 1.4 Owner role handling
- Add implicit "owner" role that can't be removed
- Owner can have other roles added/modified, but always has owner privileges
- Remove the "cannot moderate owner" restriction for kick/ban/role changes

---

## Layer 2: Access Control Layer

### Problem
Non-members can access server resources. DM voice calls are accessible by non-participants.

### Fixes

#### 2.1 Server-wide membership check
- Add a global middleware that validates server membership for ALL server-related routes
- Return 403 Forbidden if user is not a member (and not rejoining via valid invite)
- Routes to protect:
  - `/servers/:serverId/*` (all sub-routes)
  - `/channels/:channelId/*` (all sub-routes)
  - Voice/WebSocket room joins for server channels

#### 2.2 Ban check integration
- Move ban check to middleware level
- Banned users should get 403, not just be blocked from joining

#### 2.3 DM voice call security
- SFU routes should validate that the user is a participant of the DM channel
- Only the two users in a DM can access its voice calls
- Add `validateDMChannelAccess` middleware for `/sfu/*` routes when channelId is a DM

#### 2.4 WebSocket room join security
- Implement permission check when joining channel rooms
- Implement membership check when joining server rooms

---

## Layer 3: Realtime Events Layer

### Problem
Memberlist and server list don't update in realtime.

### Fixes

#### 3.1 Server Member Events - Backend emission

| Action | Event | Payload |
|--------|-------|---------|
| Member joins | `SERVER_MEMBER_ADD` | `{ serverId, member }` |
| Member leaves | `SERVER_MEMBER_REMOVE` | `{ serverId, userId }` |
| Member kicked | `SERVER_MEMBER_REMOVE` | `{ serverId, userId, reason? }` |
| Member banned | `SERVER_MEMBER_REMOVE` + `SERVER_BAN_ADD` | `{ serverId, userId, ban }` |
| Member unbanned | `SERVER_BAN_REMOVE` | `{ serverId, userId }` |
| Member timeout | `SERVER_MEMBER_UPDATE` | `{ serverId, userId, timeoutUntil }` |
| Member mute/deafen | `SERVER_MEMBER_UPDATE` | `{ serverId, userId, voiceState }` |
| Role changed | `SERVER_MEMBER_UPDATE` | `{ serverId, userId, roles }` |

#### 3.2 Server List Events - Backend emission

| Action | Event | Payload |
|--------|-------|---------|
| User joins server | `SERVER_ADD` (to user) | `{ server }` |
| User leaves server | `SERVER_REMOVE` (to user) | `{ serverId }` |
| User kicked from server | `SERVER_REMOVE` (to user) | `{ serverId }` |
| User banned from server | `SERVER_REMOVE` (to user) | `{ serverId }` |

#### 3.3 Frontend WebSocket listeners
- Update `members-column.tsx` to listen for member events and update local state
- Update server list store to listen for server add/remove events
- Use React Query's `setQueryData` for optimistic updates or invalidation

#### 3.4 Broadcasting strategy
- Member events broadcast to `server:{serverId}` room
- Server events sent directly to user's socket via `user:{userId}` room

---

## Layer 4: UI Layer

### Problem
Memberlist doesn't group by roles or show colors, channels can't be dragged in categories, text has no styling.

### Fixes

#### 4.1 Memberlist Role Grouping & Colors
- Group members by their highest role (by position)
- Sort roles by position (highest first)
- Apply role color to member name
- Offline members still show their role color but grayed
- Members with no roles go to "Online" / "Offline" sections

#### 4.2 Channel Drag-and-Drop in Categories
- Check existing drag implementation in channel list
- Fix the drop zone logic for categorized channels
- Ensure position updates are persisted via API

#### 4.3 Text Styling with react-markdown
- Install `react-markdown` and `remark-gfm`
- Support: **bold**, *italic*, ~~strikethrough~~, `code`, > quote, code blocks
- Code blocks get syntax highlighting class
- Blockquotes get Discord-style left border
- Links are clickable (open in new tab)

#### 4.4 Owner Badge Visibility
- Show owner badge next to name in memberlist
- Owner role is implicit - always shown even if other roles exist

---

## Files to Modify

### Backend (packages/api)
- `src/middleware/permission.middleware.ts` - Fix permission resolution
- `src/middleware/server-membership.middleware.ts` - New: membership validation
- `src/routes/servers/index.ts` - Add middleware, emit events
- `src/routes/channels/index.ts` - Add permission checks
- `src/routes/messages/index.ts` - Add permission checks
- `src/services/server/server-member.service.ts` - Emit events on member changes
- `src/services/server/server-ban.service.ts` - Emit events on ban/unban
- `src/services/websocket/handlers/room.handler.ts` - Add permission validation
- `src/routes/sfu/index.ts` - Add DM access validation

### Frontend (packages/web)
- `components/layout/members-column.tsx` - Role grouping, colors, event listeners
- `components/layout/navigation-column.tsx` - Server list event listeners
- `components/messaging/message-view.tsx` - Markdown rendering
- `components/channels/channel-list.tsx` - Fix drag-and-drop
- `hooks/use-server-member-events.ts` - New: WebSocket event hook
- `hooks/use-server-events.ts` - New: Server list event hook
- `stores/server-members.store.ts` - Update for realtime

### Shared (packages/shared)
- `src/types/websocket.ts` - Add new event types

---

## Out of Scope
- DM Calling System (voice, video, call timer) - Future feature
