# FreedomTalk Dayshift Tasks

## Priority 1: Critical Bugs (Blocking)

### Task 1: Fix ServerMembersTab Runtime Error
- **File**: `packages/web/components/server/ServerMembersTab.tsx:156`
- **Issue**: `Cannot read properties of undefined (reading 'charAt')` - member.displayName and member.username can be undefined
- **Fix**: Add null checks and fallback values
- **Test**: Verify members tab loads without errors

### Task 2: Fix DM Messages Not Persisting to Database
- **Issue**: DM messages only show for current socket connection, not saved to database
- **Files**: `packages/api/src/services/websocket/handlers/message.handler.ts`, `packages/api/src/services/message/message.service.ts`
- **Fix**: Ensure DM messages are persisted to database via proper service calls
- **Test**: Send DM, refresh page, verify message persists

### Task 3: Fix Message Edit/Delete Not Working
- **Issue**: Editing a message creates a new message instead of updating; deleting doesn't work
- **Files**: Message handlers, message store, message service
- **Fix**: Implement proper MESSAGE_UPDATE and MESSAGE_DELETE handlers with database sync
- **Test**: Edit message, verify update in DB; delete message, verify removal

---

## Priority 2: Server Management

### Task 4: Implement Server Settings Modal
- **Issue**: Pressing server name should open modal to edit name, icon, banner, description
- **Files**: `packages/web/components/server/ServerSettingsModal.tsx`
- **Requirements**:
  - Edit server name
  - Upload/change server icon
  - Upload/change server banner
  - Edit server description
- **API**: Create/Update server settings endpoint
- **Test**: Edit all server properties, verify in DB and UI

### Task 5: Implement Server Invite System
- **Issue**: No way to create/share invites to server
- **Requirements**:
  - Create custom invite codes
  - Set invite expiration
  - Set max uses
  - Share invite link
  - Invite button in server settings modal
- **API**: `POST /api/v1/servers/:id/invites`, `GET /api/v1/invites/:code`
- **Test**: Create invite, join server via invite

### Task 6: Implement Channel Management
- **Issue**: Add channel/category button does nothing; can't edit categories; can't reorder
- **Requirements**:
  - Create text/voice channels
  - Create categories
  - Edit channels (name, permissions, topic)
  - Delete channels
  - Drag-and-drop reordering
- **API**: CRUD endpoints for channels, position update endpoint
- **Test**: Full channel lifecycle test

### Task 7: Implement Server Context Menu Actions
- **Issue**: Mute server, leave server, reorder servers not working
- **Requirements**:
  - Mute/unmute server
  - Leave server (with confirmation)
  - Drag-and-drop server reordering
  - Persist order to database
- **Test**: Test all context menu actions

---

## Priority 3: Voice/Call System

### Task 8: Fix Voice Channel Connection
- **Issue**: Voice channels don't connect; API returns 200 but no WebRTC connection
- **Files**: Voice routes, voice state service, webRTC handling
- **Requirements**:
  - Proper WebRTC signaling
  - Voice state management
  - Connect/disconnect handling
- **Test**: Join voice channel, verify audio works

### Task 9: Implement DM Call/Video Call
- **Issue**: Call and video call buttons in DMs do nothing
- **Requirements**:
  - 1:1 voice calls
  - 1:1 video calls
  - Call UI overlay
  - Accept/reject calls
- **Test**: Make/receive call between two users

---

## Priority 4: Message System Enhancements

### Task 10: Implement Pinned Messages
- **Issue**: Pins button in DMs not working
- **Requirements**:
  - Pin/unpin messages
  - View pinned messages modal
  - Persist pins to database
- **Test**: Pin message, view pins, unpin

### Task 11: Fix Message Grouping
- **Issue**: Shows date of first message instead of last message in group
- **Fix**: Update grouping logic to use last message timestamp
- **Test**: Verify correct date display in grouped messages

---

## Priority 5: User/Profile System

### Task 12: Implement User Profile Modal
- **Issue**: Clicking username in DM or member list should show profile
- **Requirements**:
  - User profile modal with avatar, banner, bio
  - Show mutual servers
  - Show joined date
  - Add friend/message buttons
- **Test**: Click username, verify profile modal opens

### Task 13: Fix Member List
- **Issue**: Only shows users who sent messages, shown as offline/Unknown User
- **Requirements**:
  - Show all server members
  - Display online/offline status
  - Update presence every 2-3 minutes
  - For servers >100 members, show only online
- **Fix**: Proper member fetching and presence updates
- **Test**: Verify member list accuracy

---

## Priority 6: Friend System

### Task 14: Fix Friend List Realtime Updates
- **Issue**: Friend list needs manual refresh for requests/accepts/deletes
- **Requirements**:
  - Realtime friend request notifications
  - Realtime accept/decline updates
  - Realtime friend removal
- **Fix**: WebSocket events for friend actions
- **Test**: Send/accept friend request, verify realtime update

### Task 15: Fix Online Status in Friend List
- **Issue**: All users show as online when they're not
- **Requirements**:
  - Show correct online/offline status
  - Separate online and offline sections
  - Show activity status (online/idle/dnd/offline)
- **Test**: Verify correct status display

### Task 16: Fix Friends Search Scope
- **Issue**: Search bar searches all users instead of just friends
- **Fix**: Update search query to filter by friendship
- **Test**: Search only returns friends

---

## Priority 7: Onboarding & Navigation

### Task 17: Fix Onboarding Persistence
- **Issue**: Onboarding shows on every login instead of checking database
- **Requirements**:
  - Store onboarding_completed flag in user database
  - Check flag on login
  - Skip onboarding if completed
- **Test**: Complete onboarding, re-login, verify skip

### Task 18: Add Sidebar to Discover Servers Page
- **Issue**: Discover page has no server sidebar, users get stuck
- **Fix**: Include server list sidebar on discover page
- **Test**: Navigate from discover to servers

### Task 19: Fix Server Search Scope
- **Issue**: Server search searches all servers instead of joined ones
- **Fix**: Filter to only show joined servers
- **Test**: Search only returns joined servers

---

## Priority 8: Performance & Backend

### Task 20: Optimize Presence Updates
- **Issue**: Presence updates too frequent, causing unnecessary traffic
- **Requirements**:
  - Throttle updates to 30-second intervals
  - Only send presence to relevant users (friends, server members)
  - Remove presence updates for unrelated users
- **Test**: Monitor WebSocket traffic

### Task 21: Ensure All Changes Sync to Database
- **Issue**: Many frontend changes don't persist
- **Audit Items**:
  - Server create/delete
  - Channel create/edit/delete/reorder
  - Server reorder
  - Settings changes
  - Message CRUD
- **Test**: Verify each operation persists after refresh

---

## Priority 9: Testing

### Task 22: Implement Playwright E2E Test Suite
- **Requirements**:
  - Authentication flow tests
  - Server management tests
  - Channel management tests
  - Message CRUD tests
  - Voice channel tests
  - Friend system tests
  - DM tests
- **Test**: All tests passing

---

## Progress Tracking

| Task | Status | Commit |
|------|--------|--------|
| 1 | completed | b0f5a2d |
| 2 | completed | 8a433b3 |
| 3 | completed | 210f813 |
| 4 | completed | (banner editing) |
| 5 | completed | (invite modal) |
| 6 | completed | 27ffc84 |
| 7 | completed | 7092d04 |
| 8 | completed | bb1b428 |
| 9 | completed | bb1b428 |
| 10 | completed | 50f07a0 |
| 11 | completed | d76c362 |
| 12 | completed | f0163f1 |
| 13 | completed | 8ee5a8f |
| 14 | completed | 48bc2cc |
| 15 | completed | e16dfc1 |
| 16 | completed | d105e07 |
| 17 | completed | 6f910cb |
| 18 | completed | 74ebaa8 |
| 19 | completed | 3fc7534 |
| 20 | completed | f5feba2 |
| 21 | completed | (verified during tasks) |
| 22 | completed | 8decc22 |

---

## Notes
- Each task should be committed after completion
- Run tests after each task
- Ensure TypeScript compiles with `npm run type-check`
- Run lint with `npm run lint` before committing
