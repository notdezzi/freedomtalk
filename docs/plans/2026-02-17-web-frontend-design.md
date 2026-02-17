# Web Frontend Design Document

**Date:** 2026-02-17
**Status:** Approved
**Scope:** FreedomTalk Web Frontend (packages/web)

## Overview

Build a production-ready, Discord-faithful web frontend to test and interact with all implemented backend features (Phases 1-4). The frontend will follow a sequential feature-by-feature implementation approach with Zustand + React Query for state management.

## High-Level Architecture

### Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Framework (App Router) |
| Tailwind CSS 4 | Styling with custom Discord theme |
| Zustand | UI state management |
| React Query | Server state, caching, optimistic updates |
| Socket.io-client | WebSocket real-time communication |
| React Hook Form | Form handling |
| Zod | Validation |
| Lucide React | Icons |

### Directory Structure

```
packages/web/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth route group (no layout)
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── verify-email/
│   │   └── mfa/
│   ├── (main)/              # Main app route group (with app layout)
│   │   ├── channels/        # Server channels
│   │   │   └── [serverId]/
│   │   │       └── [channelId]/
│   │   ├── dm/              # Direct messages
│   │   │   └── [channelId]/
│   │   ├── settings/        # User settings
│   │   └── @me/             # User profile routes
│   ├── layout.tsx
│   ├── page.tsx             # Landing page
│   └── globals.css
├── components/
│   ├── ui/                  # Base UI components
│   ├── auth/                # Auth-specific components
│   ├── chat/                # Chat components
│   ├── server/              # Server components
│   ├── voice/               # Voice/Video components
│   └── layout/              # Layout components
├── hooks/                   # Custom hooks
├── stores/                  # Zustand stores
├── lib/                     # Utilities, API client, WebSocket
└── types/                   # TypeScript types
```

### Theme System

Discord-faithful color tokens:

```css
/* Backgrounds */
--background-primary: #313338
--background-secondary: #2b2d31
--background-secondary-alt: #232428
--background-tertiary: #1e1f22
--background-accent: #404249

/* Text */
--text-normal: #dbdee1
--text-muted: #949ba4
--text-link: #00a8fc

/* Brand */
--brand-experiment: #5865f2

/* Status */
--green: #23a559
--yellow: #f0b132
--red: #da373c
```

---

## Milestone W1: Auth & Foundation

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero section, feature highlights, CTA buttons |
| Login | `/login` | Email/username + password, OAuth buttons |
| Register | `/register` | Username, email, password, terms checkbox |
| Forgot Password | `/forgot-password` | Email input, sends reset link |
| Reset Password | `/reset-password?token=...` | New password form |
| Verify Email | `/verify-email?token=...` | Confirmation page |
| MFA Setup | `/mfa/setup` | QR code, backup codes, verification |
| MFA Verify | `/mfa/verify` | 6-digit code input |

### Components

**Auth Components:**
- `AuthForm` - Shared form wrapper with consistent styling
- `OAuthButton` - Google/GitHub login buttons
- `PasswordField` - Password input with show/hide and strength indicator
- `MFACodeInput` - 6-digit code input with auto-focus

**Layout Components:**
- `AppShell` - Main layout wrapper (sidebar + content)
- `AuthLayout` - Centered card layout for auth pages

### State & Hooks

- `useAuthStore` - Current user, auth status, login/logout
- `useAuth` - Auth state + React Query integration
- `apiClient` - Axios instance with cookie handling

### Deliverables

- [ ] Landing page with Discord-like hero
- [ ] Complete login/register flows
- [ ] OAuth integration (Google, GitHub)
- [ ] Password reset flow
- [ ] Email verification handling
- [ ] MFA setup and verification
- [ ] Auth state persistence (cookies)
- [ ] Protected route wrapper

---

## Milestone W2: DM & Messaging

### Pages

| Page | Route | Description |
|------|-------|-------------|
| DM List | `/dm` | List of DM channels, create new DM |
| DM Channel | `/dm/[channelId]` | Message view for DM |

### Components

**DM Components:**
- `DMList` - Sidebar list of DM channels with unread indicators
- `DMListItem` - Single DM entry (avatar, name, unread badge)
- `CreateDMModal` - Search users to start new DM
- `CreateGroupDMModal` - Add users (2-10), name group
- `GroupDMSettings` - Edit group name, manage participants

**Message Components:**
- `MessageList` - Virtualized message container
- `Message` - Single message (avatar, author, timestamp, content)
- `MessageInput` - Rich input with formatting toolbar
- `MessageEditor` - Edit mode for messages
- `MessageContextMenu` - Right-click menu
- `MessageReactions` - Reaction display with emoji + count
- `ReactionPicker` - Emoji picker for reactions
- `SystemMessage` - Join/leave/pin messages

**Attachment Components:**
- `AttachmentPreview` - Upload progress, preview
- `AttachmentDisplay` - Render attachments in messages
- `ImageLightbox` - Full-screen image viewer

**Embed Components:**
- `Embed` - Open Graph embeds (title, description, image)
- `LinkPreview` - Loading state while fetching

**Markdown Components:**
- `MarkdownRenderer` - Parse and render markdown
- `CodeBlock` - Syntax-highlighted code
- `SpoilerText` - Hidden text revealed on click
- `Mention` - @user, @role, #channel mentions

### State & Hooks

- `useDMStore` - DM channels list, active DM
- `useMessageStore` - Messages by channel
- `useMessages` - React Query for message fetching
- `useWebSocket` - Socket.io connection
- `useTypingIndicator` - Typing state

### WebSocket Events

- `message:create` / `message:update` / `message:delete`
- `reaction:add` / `reaction:remove`
- `typing:start` / `typing:stop`
- `presence:update`

### Deliverables

- [ ] DM channel list with unread counts
- [ ] Create new DM / Group DM (2-10 users)
- [ ] Message display with markdown support
- [ ] Message input with formatting
- [ ] Message edit and delete
- [ ] Reactions (add/remove, emoji picker)
- [ ] File attachments (upload, preview, display)
- [ ] Link embeds (auto-preview URLs)
- [ ] Typing indicators
- [ ] User presence (online/offline/away)
- [ ] Message pagination (infinite scroll)

---

## Milestone W3: Servers & Channels

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Server Channel | `/channels/[serverId]/[channelId]` | Main server channel view |

### Components

**Server Navigation:**
- `ServerList` - Left sidebar with server icons
- `ServerIcon` - Single server button with unread indicator
- `ServerFolder` - Collapsible server folders
- `AddServerButton` - Create/join server

**Channel Navigation:**
- `ChannelSidebar` - Full-height sidebar for server
- `ChannelCategory` - Collapsible category header
- `ChannelItem` - Text/Voice/Announcement entry
- `VoiceChannelItem` - Voice channel with connected users
- `ChannelHeader` - Current channel name, topic

**Server Management:**
- `CreateServerModal` - Name, icon, template
- `JoinServerModal` - Invite code/link
- `ServerSettingsModal` - Overview, Roles, Members, etc.
- `ServerOverview` - Edit name, icon, banner
- `ServerMemberList` - Right sidebar, grouped by role

**Channel Management:**
- `CreateChannelModal` - Name, type, category
- `EditChannelModal` - Name, topic, NSFW, slow mode
- `CreateCategoryModal` - Category name and position
- `ChannelSettingsModal` - Full configuration

**Invite System:**
- `InviteModal` - Generate link, expiry, max uses
- `InviteList` - Active invites with stats
- `InviteAccept` - Landing via invite link

### State & Hooks

- `useServerStore` - User's servers, active server
- `useChannelStore` - Channels by server
- `useServer` / `useChannels` / `useMembers`

### WebSocket Events

- `server:update` / `server:delete`
- `channel:create` / `channel:update` / `channel:delete`
- `member:join` / `member:leave`

### Deliverables

- [ ] Server list sidebar with icons
- [ ] Create server modal (with templates)
- [ ] Join server via invite code
- [ ] Channel sidebar with categories
- [ ] Create/Edit/Delete channels
- [ ] Create/Edit/Delete categories
- [ ] Channel position reordering
- [ ] Member list sidebar (grouped by role)
- [ ] Server settings modal
- [ ] Invite generation and management

---

## Milestone W4: Roles & Permissions

### Components

**Role Management:**
- `RoleList` - List of server roles
- `RoleItem` - Single role entry
- `CreateRoleModal` - Name, color, permissions
- `EditRoleModal` - Full role configuration
- `RoleColorPicker` - Preset + custom colors
- `RoleIconPicker` - Emoji or unicode icon
- `RolePermissions` - Permission checkboxes by category

**Permission Categories:**
- General: View Channels, Manage Channels, Manage Roles
- Membership: Create Invites, Kick, Ban
- Text: Send Messages, Manage Messages, Embed Links
- Voice: Connect, Speak, Stream, Mute Members
- Advanced: Administrator, All Permissions

**Member Management:**
- `MemberList` - Server members with search
- `MemberListItem` - User with roles
- `MemberContextMenu` - Assign roles, kick, ban
- `AssignRoleModal` - Checkbox list of roles
- `MemberProfileCard` - Roles, join date

**Ban Management:**
- `BanList` - Banned users with reason
- `BanModal` - Ban with reason, delete history
- `UnbanModal` - Confirm unban

**Permission Overwrites:**
- `PermissionOverwriteList` - Channel permissions
- `CreateOverwriteModal` - Add role/member override
- `EditOverwriteModal` - Allow/deny checkboxes
- `PermissionSyncIndicator` - Channel vs category diff

### State & Hooks

- `useRoleStore` - Roles for active server
- `usePermissions` - Check user permissions
- `usePermissionOverwrites` - Channel overwrites

### Utility Functions

- `hasPermission(userPermissions, permission)` - Bitwise check
- `calculatePermissions(member, roles)` - Effective permissions
- `getPermissionBreakdown(channel, member)` - Debug view

### Deliverables

- [ ] Role CRUD (create, edit, delete, reorder)
- [ ] Role color and icon assignment
- [ ] Role permissions editor (41 flags)
- [ ] Assign/remove roles from members
- [ ] Member list with role filtering
- [ ] Kick members with confirmation
- [ ] Ban/unban with reason
- [ ] Channel permission overwrites
- [ ] Permission hierarchy display
- [ ] Administrator bypass indicator

---

## Milestone W5: Voice & Video

### Components

**Voice Connection:**
- `VoiceChannelPanel` - Connected status (bottom sidebar)
- `VoiceConnected` - Status with controls
- `VoiceParticipant` - User in voice (avatar, speaking indicator)
- `VoiceParticipantsList` - All users in channel
- `VoiceControls` - Mic, headphones, camera, screen

**Voice Channel UI:**
- `VoiceChannelView` - Expanded participant view
- `SpeakingIndicator` - Green ring when speaking
- `VolumeSlider` - Per-user volume
- `VoiceStatusIcon` - Voice status in member list

**Video Calling:**
- `VideoGrid` - Responsive grid for video streams
- `VideoParticipant` - Video tile
- `VideoCallPanel` - Full-screen video interface
- `ToggleVideoButton` - Start/stop camera
- `VideoQualitySelector` - 720p, 1080p, auto

**Screen Sharing:**
- `ScreenShareModal` - Choose screen/window/tab
- `ScreenShareView` - Display shared screen
- `ScreenShareControls` - Pause, stop, switch
- `ScreenShareIndicator` - Who's sharing banner

**Voice Settings:**
- `VoiceSettingsPanel` - Device selection
- `InputVolumeMeter` - Microphone level
- `NoiseSuppressionToggle` - Enable/disable
- `VideoPreview` - Camera preview

### State & Hooks

- `useVoiceStore` - Connection, participants, speaking
- `useMediaSettings` - Device preferences
- `useVoiceChannel` - Join/leave, local stream
- `useMediaDevices` - Permissions, device list
- `useScreenShare` - Start/stop sharing
- `useWebRTC` - ICE candidates, SDP negotiation

### WebSocket Events

- `voice:join` / `voice:leave`
- `voice:state_update` - Mute/deafen/speaking
- `voice:move` - Between channels
- `webrtc:offer` / `webrtc:answer` / `webrtc:ice_candidate`

### Deliverables

- [ ] Join/leave voice channels
- [ ] Voice connection panel
- [ ] Mute/deafen controls
- [ ] Speaking indicators
- [ ] View users in voice channel
- [ ] Per-user volume control
- [ ] Video call join/start
- [ ] Video grid layout
- [ ] Camera on/off toggle
- [ ] Screen sharing
- [ ] View shared screens
- [ ] Device selection
- [ ] Voice settings panel

---

## Additional Dependencies

```json
{
  "@tanstack/react-query": "^5.x",
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^8.x",
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "rehype-highlight": "^7.x",
  "highlight.js": "^11.x",
  "react-virtuoso": "^4.x",
  "react-color": "^2.x",
  "emoji-picker-react": "^4.x",
  "framer-motion": "^11.x",
  "simple-peer": "^9.x"
}
```

## API Integration

| Backend Feature | Frontend Integration |
|-----------------|---------------------|
| REST API | Axios client with interceptors |
| WebSocket | Socket.io-client singleton |
| Authentication | HTTP-only cookies |
| File Uploads | FormData + MinIO URLs |
| Permissions | Import `Permissions` from @freedomtalk/shared |

---

## Success Criteria

1. All Phase 1-4 backend features have working UI
2. Responsive design works on desktop (mobile optional for now)
3. Real-time features (WebSocket) work reliably
4. Auth flows complete without bugs
5. Voice/video connects and streams properly
6. Performance acceptable with 100+ messages in channel
