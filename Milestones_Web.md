# FreedomTalk Web Frontend - Implementation Milestones

## Project Overview

This document provides a phased implementation roadmap for the FreedomTalk web frontend, designed to work with the backend API. Each milestone represents a working, testable increment of the frontend application.

---

## Completed: Foundation & Auth (Milestone W1) ✅

### Status: ✅ **COMPLETE** (Completed: 2026-02-17)

### Objective
Build the foundational UI infrastructure, design system, and complete authentication flow.

### Pages Implemented

| Page | Route | Status |
|------|-------|--------|
| Landing | `/` | ✅ Complete |
| Login | `/login` | ✅ Complete |
| Register | `/register` | ✅ Complete |
| Forgot Password | `/forgot-password` | ✅ Complete |
| Reset Password | `/reset-password?token=...` | ✅ Complete |
| Verify Email | `/verify-email?token=...` | ✅ Complete |

### Components Implemented

**UI Components:**
- ✅ `Button` - Primary, secondary, danger, success, ghost, link variants
- ✅ `Input` - With label, error, hint, icon support
- ✅ `Checkbox` - With label, description, error states
- ✅ `Avatar` - Multiple sizes, status indicators
- ✅ `Spinner` / `LoadingScreen` - Loading states
- ✅ `Modal` - Overlay dialogs with keyboard handling

**Infrastructure:**
- ✅ Theme system with Discord-faithful design tokens
- ✅ Tailwind CSS 4 configuration
- ✅ Zustand auth store with persistence
- ✅ React Query provider
- ✅ Axios API client with interceptors
- ✅ TypeScript types for all entities

### Design Tokens

Complete Discord-faithful color system:
- Background colors (primary, secondary, tertiary)
- Text colors (normal, muted, link)
- Brand colors (blurple, hover, active)
- Status colors (online, idle, dnd, offline)
- Button variants
- Input states
- Animation timings

### Deliverables
- ✅ Landing page with hero, features, footer
- ✅ Complete login/register flows with OAuth buttons
- ✅ Password reset flow
- ✅ Email verification handling
- ✅ Auth state persistence
- ✅ Protected route infrastructure

---

## Completed: DM & Messaging (Milestone W2) ✅

### Status: ✅ **COMPLETE** (Completed: 2026-02-17)

### Objective
Build direct message channels, message display, and real-time messaging features.

### Pages Implemented

| Page | Route | Status |
|------|-------|--------|
| DM List | `/dm` | ✅ Complete |
| DM Channel | `/dm/[channelId]` | ✅ Complete |

### Components Implemented

**DM Components:**
- ✅ `CreateDMModal` - Start new DM with user search
- ✅ `MarkdownRenderer` - Parse markdown with spoiler/mention support
- ✅ `MessageReactions` - Reaction display with add/remove
- ✅ `ReactionPicker` - Emoji picker using emoji-picker-react
- ✅ `TypingIndicator` - Shows who's typing with animated dots

**Main Layout:**
- ✅ Server list sidebar
- ✅ Channel sidebar with DM list
- ✅ User panel with status
- ✅ User menu (settings, logout)

**WebSocket Integration:**
- ✅ `useWebSocket` hook - Connection management
- ✅ Room join/leave for channels
- ✅ Event subscription system
- ✅ Typing indicators (send/receive)
- ✅ Real-time message updates
- ✅ Reaction add/remove via WebSocket

**Zustand Store:**
- ✅ `dm.store.ts` - Channels, messages, typing, unread counts

### Dependencies Added
```json
{
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "rehype-highlight": "^7.x",
  "highlight.js": "^11.x",
  "react-virtuoso": "^4.x",
  "emoji-picker-react": "^4.x"
}
```

### Features Implemented
- [x] DM channel list with sidebar
- [x] Create new DM modal
- [x] Message display with markdown
- [x] Message input with Enter to send
- [x] Reactions (add/remove)
- [x] Typing indicators
- [x] User presence display
- [x] Message grouping (same author)
- [x] Spoiler text support
- [x] Mention highlighting (@user, @role, #channel)
- [x] Code syntax highlighting

### Remaining (Future)
- [ ] File attachments
- [ ] Link embeds
- [ ] Message edit/delete
- [ ] Group DM management
- [ ] Message pagination/infinite scroll

---

## Milestone W3: Servers & Channels

### Status: 🔲 **PENDING**

### Objective
Build server navigation, channel management, and server settings.

### Pages to Implement

| Page | Route | Description |
|------|-------|-------------|
| Server Channel | `/channels/[serverId]/[channelId]` | Main channel view |

### Components to Build

**Server Navigation:**
- `ServerList` - Left sidebar with icons
- `ServerIcon` - Single server button
- `AddServerButton` - Create/join server

**Channel Navigation:**
- `ChannelSidebar` - Server channels
- `ChannelCategory` - Collapsible category
- `ChannelItem` - Channel entry
- `VoiceChannelItem` - With connected users
- `ChannelHeader` - Channel name, topic

**Server Management:**
- `CreateServerModal` - Name, icon, template
- `JoinServerModal` - Invite code
- `ServerSettingsModal` - Settings tabs
- `ServerMemberList` - Right sidebar

**Channel Management:**
- `CreateChannelModal` - Name, type, category
- `EditChannelModal` - Channel settings
- `CreateCategoryModal` - Category creation
- `ChannelSettingsModal` - Full config

**Invite System:**
- `InviteModal` - Generate links
- `InviteList` - Active invites
- `InviteAccept` - Join via invite

### Dependencies to Add
```json
{
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^8.x"
}
```

### Deliverables
- [ ] Server list sidebar
- [ ] Create server modal
- [ ] Join server via invite
- [ ] Channel sidebar with categories
- [ ] Create/Edit/Delete channels
- [ ] Channel position reordering
- [ ] Member list sidebar
- [ ] Server settings modal
- [ ] Invite generation

---

## Milestone W4: Roles & Permissions

### Status: 🔲 **PENDING**

### Objective
Build role management and permission system UI.

### Components to Build

**Role Management:**
- `RoleList` - Server roles
- `RoleItem` - Single role
- `CreateRoleModal` - Name, color, permissions
- `EditRoleModal` - Full configuration
- `RoleColorPicker` - Color selection
- `RoleIconPicker` - Icon selection
- `RolePermissions` - Permission checkboxes

**Member Management:**
- `MemberList` - Server members
- `MemberListItem` - User with roles
- `MemberContextMenu` - Actions menu
- `AssignRoleModal` - Role assignment
- `MemberProfileCard` - Profile card

**Ban Management:**
- `BanList` - Banned users
- `BanModal` - Ban with reason
- `UnbanModal` - Confirm unban

**Permission Overwrites:**
- `PermissionOverwriteList` - Channel permissions
- `CreateOverwriteModal` - Add override
- `EditOverwriteModal` - Allow/deny
- `PermissionSyncIndicator` - Sync status

### Deliverables
- [ ] Role CRUD
- [ ] Role color and icon
- [ ] Role permissions editor
- [ ] Assign/remove roles
- [ ] Member list with filtering
- [ ] Kick/ban members
- [ ] Channel permission overwrites
- [ ] Permission hierarchy display

---

## Milestone W5: Voice & Video

### Status: 🔲 **PENDING**

### Objective
Build voice channel connection and video calling features.

### Components to Build

**Voice Connection:**
- `VoiceChannelPanel` - Connected status
- `VoiceConnected` - Status with controls
- `VoiceParticipant` - User in voice
- `VoiceParticipantsList` - All users
- `VoiceControls` - Mic, headphones, etc.

**Voice Channel UI:**
- `VoiceChannelView` - Participant view
- `SpeakingIndicator` - Green ring
- `VolumeSlider` - Per-user volume
- `VoiceStatusIcon` - Status in list

**Video Calling:**
- `VideoGrid` - Responsive grid
- `VideoParticipant` - Video tile
- `VideoCallPanel` - Full-screen video
- `ToggleVideoButton` - Camera control
- `VideoQualitySelector` - Quality options

**Screen Sharing:**
- `ScreenShareModal` - Choose source
- `ScreenShareView` - Display screen
- `ScreenShareControls` - Pause, stop
- `ScreenShareIndicator` - Sharing status

**Voice Settings:**
- `VoiceSettingsPanel` - Device selection
- `InputVolumeMeter` - Mic level
- `NoiseSuppressionToggle` - Toggle
- `VideoPreview` - Camera preview

### Dependencies to Add
```json
{
  "simple-peer": "^9.x"
}
```

### Deliverables
- [ ] Join/leave voice channels
- [ ] Voice connection panel
- [ ] Mute/deafen controls
- [ ] Speaking indicators
- [ ] View users in voice
- [ ] Per-user volume
- [ ] Video call join/start
- [ ] Video grid layout
- [ ] Camera toggle
- [ ] Screen sharing
- [ ] Device selection
- [ ] Voice settings panel

---

## Future Milestones

### Milestone W6: Search & Discovery
- Full-text search UI
- User/server search
- Server discovery directory
- Search autocomplete

### Milestone W7: Advanced Features
- Custom emojis picker
- Sticker support
- Auto-moderation settings
- Scheduled events UI
- Rich presence display
- Polls

### Milestone W8: Production Polish
- Performance optimization
- Accessibility improvements
- Error boundaries
- Loading states
- Offline support
- Mobile responsive design

---

## Current Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | Framework (App Router) |
| React | 19.2.3 | UI library |
| Tailwind CSS | 4.x | Styling |
| Zustand | 4.5.0 | State management |
| React Query | 5.x | Server state |
| Socket.io-client | 4.8.1 | WebSocket |
| React Hook Form | 7.53.2 | Forms |
| Zod | 3.24.1 | Validation |
| Axios | - | HTTP client |
| Lucide React | 0.460.0 | Icons |
| clsx | - | Class utilities |

---

## File Structure

```
packages/web/
├── app/
│   ├── (auth)/              # Auth pages ✅
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   ├── (main)/              # Main app ✅
│   │   ├── layout.tsx       # App shell with sidebar
│   │   └── dm/              # DM pages ✅
│   │       ├── page.tsx     # DM list
│   │       └── [channelId]/ # DM channel view
│   ├── layout.tsx
│   ├── page.tsx             # Landing ✅
│   └── globals.css          # Theme system ✅
├── components/
│   ├── ui/                  # Base components ✅
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Avatar.tsx
│   │   ├── Modal.tsx
│   │   └── Spinner.tsx
│   ├── chat/                # Chat components ✅
│   │   ├── CreateDMModal.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── MessageReactions.tsx
│   │   ├── ReactionPicker.tsx
│   │   └── TypingIndicator.tsx
│   ├── server/              # Server components (W3)
│   ├── voice/               # Voice components (W5)
│   └── layout/              # Layout components
├── stores/
│   ├── auth.store.ts        # Auth state ✅
│   └── dm.store.ts          # DM state ✅
├── lib/
│   ├── api.ts               # API client ✅
│   ├── query-provider.tsx   # React Query ✅
│   └── utils.ts             # Utilities ✅
├── types/
│   └── index.ts             # TypeScript types ✅
└── hooks/
    ├── index.ts
    └── useWebSocket.ts      # WebSocket hook ✅
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev --workspace=@freedomtalk/web

# Type check
npm run type-check --workspace=@freedomtalk/web
```

---

## Notes

- Auth pages are complete and functional ✅
- DM pages are complete with real-time messaging ✅
- Backend API must be running on port 3001 (or set `NEXT_PUBLIC_API_URL`)
- WebSocket must be running for real-time features (or set `NEXT_PUBLIC_WS_URL`)
- OAuth flows redirect to backend endpoints
- All components use CSS variables for theming
- Socket.io integration is complete for real-time features ✅
