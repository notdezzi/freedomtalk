# Frontend Rewrite Design Document

**Date:** 2026-02-19
**Status:** Approved
**Scope:** Complete rewrite of `/app` frontend (excluding landing page and auth)

---

## Executive Summary

This document outlines the design for a complete frontend rewrite of FreedomTalk's main application. The rewrite focuses on:

1. **New Layout Architecture** - Sticky header + 3-column content layout as specified in `docs/archive/app-followups.md`
2. **Highly Generalized Components** - Slot-based components for maximum code reuse
3. **Hybrid State Management** - React Query for server state, Zustand for client state
4. **Feature-Based Organization** - Clear separation of concerns
5. **Accessibility & Performance** - A11y compliance and optimizations

---

## 1. Layout Architecture

### Grid Structure

```
+---------------------------------------------------------------------+
|  HEADER ROW (sticky, h-14)                                          |
|                    Section Name (centered)                           |
+---------------------------------------------------------------------+
+---------------+---------------------------------+---------------+
|    NAV        |         CONTENT                 |   MEMBERS     |
|   (4/16)      |           (8/16)                |    (4/16)     |
|   sticky      |                                 |   sticky      |
|               |                                 |  toggleable   |
| +-----------+ |                                 |               |
| |  Server   | |                                 |               |
| |  List     | |                                 |               |
| |  (1/4)    | |                                 |               |
| +-----------+ |                                 |               |
| |  Channel  | |                                 |               |
| |  /DM List | |                                 |               |
| |  (3/4)    | |                                 |               |
| +-----------+ |                                 |               |
| | USER PANEL | |                                 |               |
| | (avatar,  | |                                 |               |
| |  username,| |                                 |               |
| |  status,  | |                                 |               |
| |  controls)| |                                 |               |
| +-----------+ |                                 |               |
+---------------+---------------------------------+---------------+
```

### Layout Components

| Component | Description |
|-----------|-------------|
| `AppShell` | Root layout container managing the grid |
| `Header` | Sticky top bar with centered section name |
| `NavigationColumn` | Sticky left column (4/16) with server list + channel list + user panel |
| `ContentColumn` | Main content area (8/16), expands when members hidden |
| `MembersColumn` | Toggleable right sidebar (4/16) |
| `UserPanel` | Bottom of nav column - avatar, username, status, mute/deafen/settings |

### Responsive Behavior

- **Desktop (>=1280px):** Full 4-column layout
- **Tablet (768-1279px):** Members column hidden by default, toggle with button
- **Mobile (<768px):** Single column, navigation overlay, content fills screen

---

## 2. Generalized Components

### Design Principle: Slot-Based with Variants

Each generalized component uses a `variant` prop to switch contexts, with slots for customization.

### 2.1 Navigation Components

#### IconList (Server List, DM Icons)

```typescript
interface IconListProps {
  variant: 'servers' | 'dm-icons';
  items: IconItem[];
  activeId?: string;
  onItemClick: (id: string) => void;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

interface IconItem {
  id: string;
  icon?: string;
  acronym?: string;
  name: string;
  color?: string;
  unread?: number;
  hasNotification?: boolean;
  isOnline?: boolean;
}
```

#### ItemList (Channel List, DM List, Member List, Friends List)

```typescript
interface ItemListProps<T> {
  variant: 'channels' | 'dms' | 'members' | 'friends';
  items: T[];
  activeId?: string;
  groupBy?: keyof T;
  renderItem: (item: T) => React.ReactNode;
  onItemClick: (item: T) => void;
  headerComponent?: React.ReactNode;
  emptyState?: React.ReactNode;
}
```

### 2.2 Messaging Components

#### MessageView (Channel Chat, DM Chat)

```typescript
interface MessageViewProps {
  context: 'server' | 'dm';
  channelId: string;
  messages: Message[];
  typingUsers?: TypingUser[];
  onSend: (content: string, attachments?: File[]) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}
```

#### MessageItem

```typescript
interface MessageItemProps {
  message: Message;
  variant: 'default' | 'compact' | 'grouped';
  showHeader: boolean;
  isEditing: boolean;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onPin: () => void;
  context: 'server' | 'dm';
}

// Message states
type MessageState = 'sending' | 'sent' | 'failed' | 'editing' | 'replying';

// Message types
type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'embed' | 'sticker' | 'system';
```

### 2.3 User/Member Components

#### ProfilePanel (Member Sidebar, DM Profile, User Profile Modal)

```typescript
interface ProfilePanelProps {
  variant: 'sidebar' | 'modal' | 'dm-profile';
  user: User;
  serverContext?: {
    serverId: string;
    roles: Role[];
    joinedAt: string;
  };
  friendshipStatus?: 'none' | 'friends' | 'pending-sent' | 'pending-received' | 'blocked';
  onMessage?: () => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onBlock?: () => void;
  activities?: Activity[];
  voiceChannel?: string;
}
```

#### UserAvatar

```typescript
interface UserAvatarProps {
  src?: string;
  alt: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';
  showStatus?: boolean;
  isSpeaking?: boolean;
  isDeafened?: boolean;
  isMuted?: boolean;
}
```

### 2.4 Voice Components

#### VoicePanel

```typescript
interface VoicePanelProps {
  isConnected: boolean;
  channel?: VoiceChannel;
  users: VoiceUser[];
  selfState: {
    muted: boolean;
    deafened: boolean;
    video: boolean;
    streaming: boolean;
  };
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleVideo: () => void;
  onShareScreen: () => void;
  onDisconnect: () => void;
}

interface VoiceUser {
  userId: string;
  username: string;
  avatar?: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  video: boolean;
  streaming: boolean;
}
```

### 2.5 Component Summary

| Generalized Component | Variants | Replaces |
|----------------------|----------|----------|
| `IconList` | servers, dm-icons | ServerSidebar, DM icon list |
| `ItemList` | channels, dms, members, friends | ChannelSidebar, DMSidebar, MemberSidebar, FriendsList |
| `MessageView` | server, dm | MessageList (channel), MessageList (DM) |
| `MessageItem` | default, compact, grouped | MessageItem |
| `ProfilePanel` | sidebar, modal, dm-profile | MemberSidebar profile, UserProfileModal |
| `UserAvatar` | (sizes) | Avatar component |
| `VoicePanel` | - | VoiceConnectedPanel |
| `Modal` | (sizes) | All modal wrappers |

---

## 3. State Management

### Hybrid Approach: React Query + Zustand

### 3.1 React Query (Server State)

**Query Keys Structure:**

```typescript
export const queryKeys = {
  servers: {
    all: ['servers'] as const,
    list: () => [...queryKeys.servers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.servers.all, 'detail', id] as const,
    channels: (serverId: string) => ['servers', serverId, 'channels'] as const,
    members: (serverId: string) => ['servers', serverId, 'members'] as const,
  },
  channels: {
    messages: (channelId: string) => ['channels', channelId, 'messages'] as const,
    infinite: (channelId: string) => ['channels', channelId, 'messages', 'infinite'] as const,
  },
  dms: {
    all: ['dms'] as const,
    list: () => [...queryKeys.dms.all, 'list'] as const,
    messages: (channelId: string) => ['dms', channelId, 'messages'] as const,
  },
  friends: {
    all: ['friends'] as const,
    list: () => [...queryKeys.friends.all, 'list'] as const,
    requests: () => [...queryKeys.friends.all, 'requests'] as const,
    blocked: () => [...queryKeys.friends.all, 'blocked'] as const,
  },
  users: {
    profile: (userId: string) => ['users', userId, 'profile'] as const,
  },
};
```

**Features:**
- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Infinite scroll pagination
- Stale-while-revalidate

### 3.2 Zustand (Client State)

**5 Focused Stores:**

| Store | Purpose | Persisted |
|-------|---------|-----------|
| `authStore` | User, sessions, auth state | Yes (LocalStorage) |
| `uiStore` | Modals, sidebars, theme, context menus | No |
| `voiceStore` | Voice connection, media streams, devices | No |
| `socketStore` | Socket connection, status, subscriptions | No |
| `toastStore` | Toast notifications | No |

### 3.3 Socket Integration

```typescript
// Socket events update React Query cache directly
socket.on('MESSAGE_CREATED', (message) => {
  queryClient.setQueryData(
    queryKeys.channels.messages(message.channelId),
    (old = []) => [...old, message]
  );
});
```

---

## 4. Folder Structure

```
packages/web/
+-- app/                          # Next.js App Router
|   +-- (auth)/                   # Auth group
|   +-- (landing)/                # Landing page group
|   +-- (app)/                    # Main app group
|   |   +-- layout.tsx            # AppShell wrapper
|   |   +-- page.tsx              # /app -> Home/DMs
|   |   +-- servers/[serverId]/channels/[channelId]/page.tsx
|   |   +-- dms/[channelId]/page.tsx
|   +-- layout.tsx                # Root layout
|   +-- globals.css
|
+-- components/
|   +-- ui/                       # Base UI primitives
|   +-- layout/                   # Layout components (AppShell, Header, etc.)
|   +-- navigation/               # IconList, ItemList
|   +-- messaging/                # MessageView, MessageItem, etc.
|   +-- voice/                    # VoicePanel, VideoGrid, etc.
|   +-- user/                     # ProfilePanel, UserAvatar
|   +-- modals/                   # Modal components
|   +-- common/                   # ContextMenu, Toast, etc.
|
+-- features/                     # Feature-based logic
|   +-- servers/api.ts, types.ts, utils.ts
|   +-- channels/api.ts, types.ts, utils.ts
|   +-- messages/api.ts, types.ts, utils.ts
|   +-- dms/api.ts, types.ts, utils.ts
|   +-- friends/api.ts, types.ts, utils.ts
|   +-- voice/api.ts, types.ts, webrtc.ts, utils.ts
|   +-- auth/api.ts, types.ts, utils.ts
|
+-- stores/                       # Zustand stores
|   +-- auth-store.ts
|   +-- ui-store.ts
|   +-- voice-store.ts
|   +-- socket-store.ts
|   +-- toast-store.ts
|
+-- hooks/                        # Global hooks
|   +-- use-socket.ts
|   +-- use-keyboard-shortcuts.ts
|   +-- use-notifications.ts
|   +-- use-focus-trap.ts
|
+-- lib/                          # Core utilities
|   +-- api-client.ts
|   +-- socket.ts
|   +-- utils.ts
|   +-- constants.ts
|
+-- types/                        # Global types
```

---

## 5. Accessibility (a11y)

### Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + K | Open search |
| Escape | Close modal |
| Alt + Up/Down | Navigate channels |
| Ctrl + M | Toggle mute |
| Ctrl + D | Toggle deafen |

### ARIA Implementation

- `role="log"` with `aria-live="polite"` for message lists
- `role="navigation"` for server/channel lists
- `aria-current="page"` for active items
- Focus traps in modals
- Roving tabindex for keyboard navigation in lists

### Screen Reader Support

- `useAnnounce` hook for live announcements
- Descriptive aria-labels on all interactive elements
- Status changes announced (muted, connected, etc.)

---

## 6. Performance

### Optimizations

| Technique | Implementation |
|-----------|----------------|
| Virtual Scrolling | @tanstack/react-virtual for message lists |
| Image Lazy Loading | useInView with blur placeholders |
| Component Memoization | React.memo with custom comparisons |
| Code Splitting | Dynamic imports for heavy components |
| Bundle Optimization | Tree shaking, chunk splitting |
| Query Optimization | Prefetching on hover, stale times |

### Performance Targets

| Metric | Target |
|--------|--------|
| Initial Load | < 2s |
| Time to Interactive | < 3s |
| Message Render (100) | < 100ms |
| Scroll FPS | 60fps |
| Memory (1000 messages) | < 50MB |

---

## 7. Data Flow

### Request Flow

1. User action in component
2. Component calls React Query mutation/query
3. API request via api-client
4. React Query updates cache
5. Socket event received (for real-time updates)
6. Socket handler updates React Query cache
7. UI re-renders automatically

### Cache Invalidation

- Message created -> Append to channel messages cache
- Message deleted -> Remove from cache
- Server deleted -> Invalidate servers list, remove detail cache
- Friend request received -> Invalidate requests cache
- Friend request accepted -> Invalidate friends list and requests

---

## 8. API Endpoints Summary

### Servers
- `GET /api/v1/servers` - List user's servers
- `POST /api/v1/servers` - Create server
- `GET /api/v1/servers/:id` - Get server details
- `PATCH /api/v1/servers/:id` - Update server
- `POST /api/v1/invites/:code` - Join server via invite

### Channels
- `GET /api/v1/servers/:serverId/channels` - List channels
- `POST /api/v1/servers/:serverId/channels` - Create channel
- `PATCH /api/v1/channels/:id` - Update channel
- `DELETE /api/v1/channels/:id` - Delete channel

### Messages
- `GET /api/v1/channels/:channelId/messages` - List messages (paginated)
- `POST /api/v1/channels/:channelId/messages` - Send message
- `PATCH /api/v1/channels/:channelId/messages/:id` - Edit message
- `DELETE /api/v1/channels/:channelId/messages/:id` - Delete message
- `PUT /api/v1/messages/:id/reactions/:emoji` - Add reaction
- `DELETE /api/v1/messages/:id/reactions/:emoji` - Remove reaction

### DMs
- `GET /api/v1/users/@me/channels` - List DM channels
- `POST /api/v1/users/@me/channels` - Create DM

### Friends
- `GET /api/v1/users/@me/relationships` - List friends/requests/blocked
- `POST /api/v1/users/@me/relationships` - Send friend request
- `PUT /api/v1/users/@me/relationships/:userId` - Accept request/block
- `DELETE /api/v1/users/@me/relationships/:userId` - Remove/decline/unblock

### Voice
- `POST /api/v1/voice/channels/:channelId/join` - Join voice
- `POST /api/v1/voice/channels/:channelId/leave` - Leave voice
- `PATCH /api/v1/voice/sessions/:sessionId/state` - Update voice state

---

## 9. Socket Events Summary

### Client -> Server

| Event | Data |
|-------|------|
| ROOM_JOIN | roomId, roomType |
| ROOM_LEAVE | roomId, roomType |
| MESSAGE_CREATE | channelId, content, referencedMessageId? |
| MESSAGE_UPDATE | messageId, content |
| MESSAGE_DELETE | messageId |
| REACTION_ADD | channelId, messageId, emoji |
| REACTION_REMOVE | channelId, messageId, emoji |
| TYPING_START | channelId |
| TYPING_STOP | channelId |
| STATUS_CHANGE | status |
| VOICE_JOIN | channelId |
| VOICE_LEAVE | channelId |
| VOICE_STATE_UPDATE | muted, deafened, video, streaming |

### Server -> Client

| Event | Data |
|-------|------|
| AUTHENTICATED | userId |
| MESSAGE_CREATED | Message |
| MESSAGE_UPDATED | Message |
| MESSAGE_DELETED | messageId, channelId |
| REACTION_ADDED | messageId, emoji, userId |
| REACTION_REMOVED | messageId, emoji, userId |
| TYPING_START | channelId, userId, username |
| TYPING_STOP | channelId, userId |
| PRESENCE_UPDATE | userId, status, activities |
| SERVER_CREATED | Server |
| SERVER_UPDATED | Server |
| SERVER_DELETED | serverId |
| CHANNEL_CREATED | Channel |
| CHANNEL_UPDATED | Channel |
| CHANNEL_DELETED | channelId, serverId |
| FRIEND_REQUEST_RECEIVED | FriendRequest |
| FRIEND_REQUEST_ACCEPTED | userId, user |
| VOICE_USER_JOINED | VoiceUser |
| VOICE_USER_LEFT | userId, channelId |
| VOICE_USER_SPEAKING | userId, speaking |

---

## 10. Excluded Features

The following features are **NOT** included in this rewrite:

- **Threads** - Explicitly excluded per requirements
- **Rich Presence** - Activity status (playing, streaming, listening) not included
- **Mobile App** - React Native port out of scope
- **Stickers** - Not implemented in current backend

---

## Approval

This design document has been reviewed and approved for implementation.

**Next Step:** Invoke writing-plans skill to create detailed implementation plan.
