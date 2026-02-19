# Hierarchical Role-Based Permission System Design

**Date:** 2026-02-19
**Status:** Approved
**Approach:** Full Rewrite

## Overview

Implement a complete hierarchical role-based permission system with three-state permission model (Allow/Neutral/Deny) and waterfall resolution logic. This includes server role management, DM privacy controls, and a full server settings UI.

## Requirements Summary

1. **DM Permissions:** Global, non-role-based, deny-by-default with simple privacy levels
2. **@everyone Role:** Mandatory, undeletable, lowest hierarchy, auto-assigned to all members
3. **Owner Authority:** Virtual role from `owner_id`, grants all permissions, only one who can delete server
4. **Three-State Model:** Allow, Neutral, Deny per permission
5. **Waterfall Resolution:** Evaluate from highest role to lowest, first non-neutral wins
6. **Permission Categories:** General, Membership, Text, Voice, Advanced (34 total permissions)

---

## Section 1: Database Schema Changes

### Roles Table Migration

**Current:**
```sql
permissions bigint  -- Single bitmap
```

**New:**
```sql
allow_permissions bigint NOT NULL DEFAULT 0
deny_permissions bigint NOT NULL DEFAULT 0
```

**Three-state encoding:**
- Bit set in `allow` only → Allow
- Bit set in `deny` only → Deny
- Bit not set in either → Neutral
- Bit set in both → Allow wins (for safety)

### Users Table (DM Privacy)

**Add columns:**
```sql
ALTER TABLE users ADD COLUMN dm_privacy_level text NOT NULL DEFAULT 'friends_only';
-- Values: 'open', 'friends_only', 'none'
```

### @everyone Role Enforcement

Application-level enforcement:
- Role where `name = '@everyone'` and `server_id = X` is protected
- Cannot delete, cannot rename, always position 0

### Server Owner Handling

No schema change. `owner_id` on `servers` table remains source of truth. Permission service checks this first.

### Permission Overwrites

Existing `permission_overwrites` table with `allow` and `deny` columns is already compatible.

---

## Section 2: Permission Flags & Categories

### Permission Bit Positions (34 permissions)

```typescript
// General Server Permissions
VIEW_CHANNELS: 1n << 0n,
MANAGE_CHANNELS: 1n << 1n,
MANAGE_ROLES: 1n << 2n,
MANAGE_SERVER: 1n << 3n,
MANAGE_MESSAGES: 1n << 4n,

// Membership Permissions
CREATE_INVITE: 1n << 5n,
CHANGE_NICKNAME: 1n << 6n,
MANAGE_NICKNAMES: 1n << 7n,
KICK_MEMBERS: 1n << 8n,
BAN_MEMBERS: 1n << 9n,
TIMEOUT_MEMBERS: 1n << 10n,

// Text Channel Permissions
VIEW_CHANNEL: 1n << 11n,
SEND_MESSAGES: 1n << 12n,
SEND_TTS_MESSAGES: 1n << 13n,
MANAGE_MESSAGES_TEXT: 1n << 14n,
EMBED_LINKS: 1n << 15n,
ATTACH_FILES: 1n << 16n,
READ_MESSAGE_HISTORY: 1n << 17n,
MENTION_EVERYONE: 1n << 18n,
USE_EXTERNAL_EMOJIS: 1n << 19n,
ADD_REACTIONS: 1n << 20n,
USE_APPLICATION_COMMANDS: 1n << 21n,
CREATE_PUBLIC_THREADS: 1n << 22n,
CREATE_PRIVATE_THREADS: 1n << 23n,
SEND_MESSAGES_IN_THREADS: 1n << 24n,
PIN_MESSAGES: 1n << 25n,

// Voice Permissions
CONNECT: 1n << 26n,
SPEAK: 1n << 27n,
STREAM: 1n << 28n,
MUTE_MEMBERS: 1n << 29n,
DEAFEN_MEMBERS: 1n << 30n,
MOVE_MEMBERS: 1n << 31n,
USE_VOICE_ACTIVITY: 1n << 32n,

// Advanced Permissions
ADMINISTRATOR: 1n << 33n,
```

### Permission Categories (for UI grouping)

```typescript
const PERMISSION_CATEGORIES = {
  general: ['VIEW_CHANNELS', 'MANAGE_CHANNELS', 'MANAGE_ROLES',
            'MANAGE_SERVER', 'MANAGE_MESSAGES'],
  membership: ['CREATE_INVITE', 'CHANGE_NICKNAME', 'MANAGE_NICKNAMES',
               'KICK_MEMBERS', 'BAN_MEMBERS', 'TIMEOUT_MEMBERS'],
  text: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES',
         'MANAGE_MESSAGES_TEXT', 'EMBED_LINKS', 'ATTACH_FILES',
         'READ_MESSAGE_HISTORY', 'MENTION_EVERYONE', 'USE_EXTERNAL_EMOJIS',
         'ADD_REACTIONS', 'USE_APPLICATION_COMMANDS', 'CREATE_PUBLIC_THREADS',
         'CREATE_PRIVATE_THREADS', 'SEND_MESSAGES_IN_THREADS', 'PIN_MESSAGES'],
  voice: ['CONNECT', 'SPEAK', 'STREAM', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS',
          'MOVE_MEMBERS', 'USE_VOICE_ACTIVITY'],
  advanced: ['ADMINISTRATOR']
};
```

### @everyone Default Permissions

```typescript
const DEFAULT_EVERYONE_PERMISSIONS = {
  allow: VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY |
         ADD_REACTIONS | CONNECT | SPEAK | USE_VOICE_ACTIVITY,
  deny: 0n
};
```

---

## Section 3: Permission Resolution Algorithm

### Waterfall Resolution Logic

```typescript
function resolvePermission(
  userId: string,
  serverId: string,
  permission: bigint
): 'allow' | 'deny' {

  // 1. Server owner bypasses all checks
  if (isServerOwner(userId, serverId)) {
    return 'allow';
  }

  // 2. Get member's roles sorted by position (highest first)
  const roles = getMemberRoles(userId, serverId)
    .sort((a, b) => b.position - a.position);

  // 3. Waterfall through roles
  for (const role of roles) {
    if (role.allow_permissions & permission) {
      return 'allow';  // Found allow in higher role
    }
    if (role.deny_permissions & permission) {
      return 'deny';   // Found deny, stop here
    }
    // Neither set = Neutral, continue to next role
  }

  // 4. No role made a decision, default to deny
  return 'deny';
}
```

### Channel Permission Resolution (with overwrites)

```typescript
function resolveChannelPermission(
  userId: string,
  channelId: string,
  permission: bigint
): 'allow' | 'deny' {

  // 1. Owner bypasses
  if (isServerOwner(userId, serverId)) return 'allow';

  // 2. Check for ADMINISTRATOR (bypasses overwrites)
  if (resolvePermission(userId, serverId, ADMINISTRATOR) === 'allow') {
    return 'allow';
  }

  // 3. Get base server permissions via waterfall
  let result = resolveServerPermissionViaWaterfall(userId, serverId, permission);

  // 4. Apply channel overwrites in order:
  //    a) @everyone overwrite
  const everyoneOverwrite = getOverwrite(channelId, serverId);
  result = applyOverwrite(result, everyoneOverwrite, permission);

  //    b) Role overwrites (all roles user has)
  for (const role of getUserRoles(userId)) {
    const roleOverwrite = getOverwrite(channelId, role.id);
    result = applyOverwrite(result, roleOverwrite, permission);
  }

  //    c) Member-specific overwrite (highest priority)
  const memberOverwrite = getOverwrite(channelId, userId);
  result = applyOverwrite(result, memberOverwrite, permission);

  return result;
}

function applyOverwrite(
  current: 'allow' | 'deny' | 'neutral',
  overwrite: { allow: bigint, deny: bigint } | null,
  permission: bigint
): 'allow' | 'deny' | 'neutral' {
  if (!overwrite) return current;

  if (overwrite.deny & permission) return 'deny';
  if (overwrite.allow & permission) return 'allow';
  return current;
}
```

### Key Guarantees

1. **Deny-by-default:** If no explicit allow found, action is denied
2. **Hierarchy respect:** Higher roles checked first, their decision wins
3. **Owner supremacy:** Owner always has all permissions
4. **Administrator bypass:** ADMINISTRATOR grants everything, skips overwrites
5. **Overwrite priority:** Member > Role > @everyone

---

## Section 4: Backend Service Architecture

### Services Structure

```
packages/api/src/services/
├── permission/
│   ├── permission.service.ts      # Core permission resolution
│   ├── permission.types.ts        # Types and interfaces
│   └── permission.utils.ts        # Bit manipulation helpers
├── server/
│   ├── server.service.ts          # Server CRUD (existing)
│   ├── role.service.ts            # Role CRUD (existing, update for 3-state)
│   ├── server-member.service.ts   # Member management (existing)
│   ├── invite.service.ts          # Invites (existing)
│   └── ban.service.ts             # Bans (new - extract from member service)
└── dm/
    └── dm-permission.service.ts   # DM privacy checks (new)
```

### Permission Service API

```typescript
export class PermissionService {
  // Core resolution
  resolvePermission(userId, serverId, permission): 'allow' | 'deny'
  resolveChannelPermission(userId, channelId, permission): 'allow' | 'deny'

  // Convenience methods
  hasPermission(userId, serverId, permission): boolean
  hasChannelPermission(userId, channelId, permission): boolean
  hasAllPermissions(userId, serverId, permissions): boolean

  // Bulk operations (for UI)
  getPermissionBreakdown(userId, serverId): PermissionBreakdown
  getChannelPermissionBreakdown(userId, channelId): ChannelPermissionBreakdown

  // Role helpers
  getMemberRolesSorted(userId, serverId): Role[]
  calculateEffectivePermissions(userId, serverId): EffectivePermissions
}

interface PermissionBreakdown {
  [permission: string]: {
    result: 'allow' | 'deny'
    source: 'owner' | 'administrator' | `role:${string}` | 'default'
  }
}
```

### Role Service Updates

```typescript
export class RoleService {
  // Existing methods updated for 3-state
  createRole(serverId, input: { name, color, allow, deny, position? })
  updateRole(roleId, input: { name?, color?, allow?, deny?, position? })

  // New methods
  getEveryoneRole(serverId): Role
  createEveryoneRole(serverId): Role
  validateRolePermissions(allow, deny): boolean

  // Permission assignment helpers
  setPermissionAllow(roleId, permission): void
  setPermissionDeny(roleId, permission): void
  setPermissionNeutral(roleId, permission): void
}
```

### DM Permission Service

```typescript
export class DMPermissionService {
  canSendDM(senderId, recipientId): boolean
  canAddReaction(senderId, recipientId): boolean
  canAttachFiles(senderId, recipientId): boolean

  checkPrivacyLevel(senderId, recipientId): 'allow' | 'deny'
  areFriends(userId1, userId2): boolean
  isBlocked(userId1, userId2): boolean
}
```

### Middleware Integration

```typescript
export async function requireServerPermission(
  req: FastifyRequest,
  reply: FastifyReply,
  permission: bigint
): Promise<void>

export async function requireChannelPermission(
  req, reply, permission: bigint
): Promise<void>
```

---

## Section 5: API Routes Structure

### Routes Organization

```
packages/api/src/routes/
├── servers/
│   └── index.ts              # Server CRUD + member/invite endpoints
├── roles/
│   └── index.ts              # Role CRUD (extracted from servers)
├── permissions/
│   └── index.ts              # Permission checks + overwrites
├── channels/
│   └── index.ts              # Channel CRUD (existing)
├── dms/
│   └── index.ts              # DM routes with privacy checks
└── users/
    └── privacy.ts            # DM privacy settings (new)
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/servers/:serverId/roles` | List all roles |
| POST | `/servers/:serverId/roles` | Create role |
| PATCH | `/servers/:serverId/roles/:roleId` | Update role |
| DELETE | `/servers/:serverId/roles/:roleId` | Delete role |
| PATCH | `/servers/:serverId/roles/positions` | Reorder roles |
| GET | `/servers/:serverId/permissions/@me` | Current user's breakdown |
| GET | `/channels/:channelId/permissions/@me` | Channel permission breakdown |
| POST | `/permissions/check` | Check specific permissions |
| GET | `/users/me/privacy` | Get DM privacy settings |
| PATCH | `/users/me/privacy` | Update DM privacy |

---

## Section 6: Frontend UI Components

### Server Settings Modal Structure

```
packages/web/components/modals/server-settings/
├── index.tsx                    # Main modal with tab navigation
├── tabs/
│   ├── overview-tab.tsx         # Server name, description, icon
│   ├── roles-tab.tsx            # Role list + role editor
│   ├── members-tab.tsx          # Member list with role assignment
│   ├── channels-tab.tsx         # Channel list with permission overwrites
│   ├── invites-tab.tsx          # Invite management
│   └── bans-tab.tsx             # Ban list management
├── role-editor/
│   ├── role-list.tsx            # Draggable role list
│   ├── role-form.tsx            # Name, color, hoist, mentionable
│   ├── permission-editor.tsx    # 3-state permission checkboxes
│   └── permission-category.tsx  # Grouped permission section
├── member-editor/
│   ├── member-list.tsx          # Searchable, paginated member list
│   ├── member-card.tsx          # Member with role badges
│   ├── role-assignment.tsx      # Multi-select role picker
│   └── moderation-actions.tsx   # Kick, ban, timeout controls
├── channel-permissions/
│   ├── channel-list.tsx         # Channels with permission summary
│   ├── overwrite-editor.tsx     # Role/member overwrite UI
│   └── permission-summary.tsx   # Visual permission overview
└── shared/
    ├── permission-checkbox.tsx  # 3-state checkbox
    ├── permission-icon.tsx      # Permission icons
    └── color-picker.tsx         # Role color picker
```

### Permission Checkbox Component

3-state checkbox cycling: Neutral (○) → Allow (✓) → Deny (✗) → Neutral

### React Query Hooks

```typescript
// features/roles/api.ts
useServerRoles(serverId)
useCreateRole(serverId)
useUpdateRole(serverId)
useDeleteRole(serverId)

// features/permissions/api.ts
usePermissionBreakdown(serverId)
useHasPermission(serverId, permission)
useChannelOverwrites(channelId)
```

### Permission Hook for Conditional Rendering

```typescript
// hooks/use-can.ts
const canDelete = useCan(serverId, PERMISSION_FLAGS.MANAGE_SERVER);
const canMessage = useCan(serverId, channelId, PERMISSION_FLAGS.SEND_MESSAGES);
```

---

## Implementation Checklist

### Database
- [ ] Create migration to add `allow_permissions`, `deny_permissions` to roles table
- [ ] Create migration to add `dm_privacy_level` to users table
- [ ] Migrate existing role permissions to new columns

### Shared Package
- [ ] Update permission flags to new 34-permission set
- [ ] Add permission categories constant
- [ ] Add role schemas with allow/deny
- [ ] Add DM privacy types

### Backend
- [ ] Rewrite permission service with waterfall logic
- [ ] Update role service for 3-state permissions
- [ ] Create DM permission service
- [ ] Create permission middleware
- [ ] Update all routes to use new permission checks
- [ ] Add role routes
- [ ] Add privacy routes

### Frontend
- [ ] Create server settings modal structure
- [ ] Implement roles tab with draggable list
- [ ] Implement permission editor component
- [ ] Implement members tab with role assignment
- [ ] Implement channels tab with overwrites
- [ ] Implement invites tab
- [ ] Implement bans tab
- [ ] Add React Query hooks
- [ ] Add useCan hook for conditional rendering

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database migration | Option B: New schema | Cleaner, explicit allow/deny columns |
| Owner role | Option A: Virtual | Simpler, uses existing owner_id |
| DM permissions | Option B: Privacy levels | Simple and user-friendly |
| Permission set | Option A: New spec | Clean alignment with requirements |
| UI scope | Option A: Full suite | Complete feature delivery |
| Implementation | Approach 1: Full rewrite | Clean architecture, no debt |
