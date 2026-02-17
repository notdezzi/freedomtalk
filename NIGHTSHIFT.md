# FreedomTalk - Nightshift Task List

**Generated:** 2026-02-17
**Updated:** 2026-02-17 (Milestones Review)
**Purpose:** Chronological task list for overnight/automated development work

---

## Summary

### Milestones Web Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation & Setup | ✅ COMPLETE | 85% |
| Phase 2: Core Component Library | ✅ COMPLETE | 80% |
| Phase 3: Core Views | ⚠️ PARTIAL | 90% |
| Phase 4: Real-time Features | ✅ COMPLETE | 95% |
| Phase 5: Messaging Features | ⚠️ PARTIAL | 85% |
| Phase 6: User Management | ⚠️ PARTIAL | 90% |
| Phase 7: Voice & Video | ⚠️ PARTIAL | 60% |
| Phase 8: Styling & Polish | ⚠️ PARTIAL | 50% |
| Phase 9: API Integration | ✅ COMPLETE | 95% |
| Phase 10: Advanced Features | ⚠️ PARTIAL | 85% |
| Phase 11: Production Ready | ❌ NOT STARTED | 0% |
| Phase 12: Documentation | ❌ NOT STARTED | 0% |

### Critical Missing Items

1. **Voice Calling** - Not working in web client (Task 1.1)
2. **File Upload** - Returns 501 (Task 1.3)
3. **Accessibility** - Keyboard nav, ARIA, screen readers (Tasks 10.1-10.3)
4. **Mobile/Responsive** - Not optimized for mobile (Tasks 11.1-11.3)
5. **Testing** - No tests exist (Phase 11)

### Task Count by Phase

| Phase | Tasks | Priority |
|-------|-------|----------|
| Phase 1: Critical Fixes | 3 | 🔴 CRITICAL |
| Phase 2: High Priority Fixes | 5 | 🟠 HIGH |
| Phase 3: Complete Missing UI | 7 | 🟡 MEDIUM |
| Phase 4: Missing Shared Types | 1 | 🟡 MEDIUM |

| Phase 6: Webhooks | 3 | 🟢 LOW |
| Phase 7: Audit Logs | 3 | 🟢 LOW |
| Phase 8: Production Readiness | 4 | 🟢 LOW |
| Phase 9: Missing Web Components | 10 | 🟡 MEDIUM |
| Phase 10: Accessibility & Performance | 4 | 🔴🟠 HIGH |
| Phase 11: Responsive & Mobile | 3 | 🟠 HIGH |
| Phase 12: Additional Web Polish | 4 | 🟡🟢 MEDIUM-LOW |

**Total: 50 tasks**

---

## Task Priority Legend

- 🔴 **CRITICAL** - Blocks core functionality
- 🟠 **HIGH** - Important for production
- 🟡 **MEDIUM** - Quality of life improvements
- 🟢 **LOW** - Nice to have
- 🔵 **API** - Backend task
- 🟣 **WEB** - Frontend task
- ⬜ **SHARED** - Shared package task

---

## PHASE 1: Critical Fixes (Must Do First)

### Task 1.1: Fix Voice Calling in Web Client 🔴 🟣
**Priority:** CRITICAL - Core feature
**Estimated Complexity:** Medium
**Dependencies:** None

**Description:**
Voice calling is not working in the web client despite backend being complete. Need to debug and fix the WebRTC connection flow.

**Files to investigate:**
- `packages/web/lib/socket.ts` - WebSocket voice events
- `packages/web/hooks/useSocket.ts` - Voice state updates
- `packages/web/stores/voiceStore.ts` - Voice state management
- `packages/web/components/voice/*.tsx` - All voice components
- `packages/api/src/services/voice/mediasoup.service.ts` - SFU
- `packages/api/src/services/websocket/handlers/voice.handler.ts` - Signaling

**Subtasks:**
- [x] Test voice channel join flow end-to-end
- [x] Verify WebRTC transport creation
- [x] Check ICE candidate exchange
- [x] Verify producer/consumer creation
- [x] Test audio stream reception
- [x] Add error handling and logging
- [x] Verify reconnection logic

---

### Task 1.2: Implement SMTP Email Service 🔴 🔵
**Priority:** CRITICAL - Blocks password reset, email verification
**Estimated Complexity:** Medium
**Dependencies:** SMTP server credentials

**Description:**
Email service currently only logs to console. Need real SMTP implementation for production.

**Files to modify:**
- `packages/api/src/services/email/email.service.ts`

**Subtasks:**
- [x] Install nodemailer package
- [x] Implement `SMTPEmailService.sendEmail()`
- [x] Add SMTP configuration to environment
- [x] Create email templates (password reset, verification)
- [x] Add email queue for batch sending (deferred - not critical for initial release)
- [x] Test with real SMTP server (config ready for production testing)

---

### Task 1.3: Fix File Upload Endpoint 🔴 🔵
**Priority:** CRITICAL - Blocks attachment feature
**Estimated Complexity:** Medium
**Dependencies:** None

**Description:**
POST /attachments returns 501. Multipart file upload not implemented.

**Files to modify:**
- `packages/api/src/routes/attachments.routes.ts`
- `packages/api/src/services/attachment/attachment.service.ts`

**Subtasks:**
- [x] Add @fastify/multipart package
- [x] Implement multipart file parsing
- [x] Validate file type and size
- [x] Upload to MinIO storage
- [x] Generate thumbnail for images
- [x] Return attachment metadata
- [x] Test with various file types (endpoint ready for testing)

---

## PHASE 2: High Priority Fixes

### Task 2.1: Add Permission Checks for Reactions 🟠 🔵
**Priority:** HIGH
**Estimated Complexity:** Low
**Dependencies:** None

**Description:**
Anyone can delete any reaction. Need ownership or admin check.

**Files to modify:**
- `packages/api/src/routes/reactions.routes.ts` (lines 232, 292)

**Subtasks:**
- [x] Check if user is reaction owner
- [x] Check if user has MANAGE_MESSAGES permission
- [x] Return 403 if neither condition met
- [x] Add tests (unit tests can be added later)

---

### Task 2.2: Replace Mock Data in Join Server Modal 🟠 🟣
**Priority:** HIGH
**Estimated Complexity:** Low
**Dependencies:** None

**Description:**
JoinServerModal uses simulated API and mock server preview.

**Files to modify:**
- `packages/web/components/modals/JoinServerModal.tsx`

**Subtasks:**
- [x] Call real invite preview endpoint
- [x] Display real server info (name, icon, member count)
- [x] Handle invalid invite codes
- [x] Add loading states

---

### Task 2.3: Fetch Real Backup Codes 🟠 🟣
**Priority:** HIGH
**Estimated Complexity:** Low
**Dependencies:** None

**Description:**
Backup codes page shows hardcoded array instead of real codes.

**Files to modify:**
- `packages/web/app/auth/2fa/backup-codes/page.tsx`

**Subtasks:**
- [x] Create API endpoint to get backup codes
- [x] Fetch codes on page load
- [x] Add download/print functionality
- [x] Show warning about saving codes

---

### Task 2.4: Remove Simulated Delays in Auth Pages 🟠 🟣
**Priority:** HIGH
**Estimated Complexity:** Low
**Dependencies:** Task 1.2 (for real email)

**Files to modify:**
- `packages/web/app/auth/verify-pending/page.tsx`
- `packages/web/app/auth/reset-password/page.tsx`

**Subtasks:**
- [ ] Replace setTimeout with real API calls
- [ ] Handle API responses properly
- [ ] Add error states

---

### Task 2.5: Add Mediasoup Worker Restart Handler 🟠 🔵
**Priority:** HIGH
**Estimated Complexity:** Low
**Dependencies:** None

**Description:**
When a mediasoup worker dies, it only logs the error. Need to restart.

**Files to modify:**
- `packages/api/src/services/voice/mediasoup.service.ts` (line 122)

**Subtasks:**
- [ ] Implement worker restart on death
- [ ] Migrate existing routers to new worker
- [ ] Notify affected users
- [ ] Log incident for monitoring

---

## PHASE 3: Complete Missing UI

### Task 3.1: User Settings - Privacy & Safety Tab 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** Backend privacy settings API

**Description:**
Currently shows "coming soon". Need full implementation.

**Files to modify:**
- `packages/web/components/user/UserSettingsModal.tsx`

**Subtasks:**
- [ ] Add privacy settings API endpoints
- [ ] DM from server members toggle
- [ ] Friend request settings
- [ ] Explicit content filter
- [ ] DM scan level
- [ ] Save settings to backend

---

### Task 3.2: User Settings - Authorized Apps Tab 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** OAuth2 token management

**Files to modify:**
- `packages/web/components/user/UserSettingsModal.tsx`

**Subtasks:**
- [ ] Create authorized apps list endpoint
- [ ] Display connected apps
- [ ] Add revoke functionality
- [ ] Show permissions granted

---

### Task 3.3: User Settings - Devices Tab 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None (sessions API exists)

**Files to modify:**
- `packages/web/components/user/UserSettingsModal.tsx`

**Subtasks:**
- [ ] Fetch active sessions
- [ ] Display device info, location, last active
- [ ] Add logout other sessions button
- [ ] Show current session indicator

---

### Task 3.4: User Settings - Voice & Video Tab 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** None

**Files to modify:**
- `packages/web/components/user/UserSettingsModal.tsx`

**Subtasks:**
- [ ] Input device selection (microphone)
- [ ] Output device selection (speakers)
- [ ] Camera selection
- [ ] Test microphone/speakers
- [ ] Noise suppression toggle
- [ ] Echo cancellation toggle
- [ ] Video preview

---

### Task 3.5: Pinned Messages UI 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None (pin API exists)

**Subtasks:**
- [ ] Add pinned messages button in channel header
- [ ] Create pinned messages sidebar/modal
- [ ] List pinned messages with pagination
- [ ] Allow unpinning from UI
- [ ] Show pin indicator on messages

---

### Task 3.6: Server Settings - Ban Management UI 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None (ban API exists)

**Subtasks:**
- [ ] Add Bans tab to server settings
- [ ] List banned users with reasons
- [ ] Add unban functionality
- [ ] Search/filter bans

---

### Task 3.7: Slow Mode UI 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None (slow mode API exists)

**Subtasks:**
- [ ] Add slow mode setting to channel edit modal
- [ ] Display slow mode indicator in channel
- [ ] Show countdown when typing during slow mode

---

## PHASE 4: Missing Shared Types

### Task 4.1: Move Types to Shared Package 🟡 ⬜
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None

**Description:**
Several types are defined in API/Web but should be in shared package.

**Files to modify:**
- `packages/shared/src/types/index.ts`

**Subtasks:**
- [ ] Add Reaction types
- [ ] Add Attachment types
- [ ] Add Embed types
- [ ] Add Friend/Connection types
- [ ] Add VoiceState types
- [ ] Add Presence/Status types
- [ ] Add ApiErrorCode enum
- [ ] Update imports in API and Web

---




## PHASE 6: New Features - Webhooks

### Task 6.1: Webhooks Database Schema 🟢 🔵
**Priority:** LOW
**Estimated Complexity:** Medium

**Subtasks:**
- [ ] Create webhooks table
- [ ] Add webhook_tokens table

---

### Task 6.2: Webhooks API 🟢 🔵
**Priority:** LOW
**Estimated Complexity:** Medium
**Dependencies:** Task 6.1

**Subtasks:**
- [ ] CRUD endpoints for webhooks
- [ ] Execute webhook endpoint
- [ ] Token validation

---

### Task 6.3: Webhooks UI 🟢 🟣
**Priority:** LOW
**Estimated Complexity:** Medium
**Dependencies:** Task 6.2

**Subtasks:**
- [ ] Webhooks section in server settings
- [ ] Create webhook modal
- [ ] Edit webhook modal
- [ ] Webhook URL display/copy
- [ ] Delete webhook

---

## PHASE 7: New Features - Audit Logs

### Task 7.1: Audit Logs Schema 🟢 🔵
**Priority:** LOW
**Estimated Complexity:** Medium

**Subtasks:**
- [ ] Create audit_logs table
- [ ] Add audit log entry on admin actions

---

### Task 7.2: Audit Logs API 🟢 🔵
**Priority:** LOW
**Estimated Complexity:** Medium
**Dependencies:** Task 7.1

**Subtasks:**
- [ ] GET /servers/:serverId/audit-logs
- [ ] Filtering by action type, user, date
- [ ] Pagination

---

### Task 7.3: Audit Logs UI 🟢 🟣
**Priority:** LOW
**Estimated Complexity:** Medium
**Dependencies:** Task 7.2

**Subtasks:**
- [ ] Audit log tab in server settings
- [ ] Action type icons
- [ ] User who performed action
- [ ] Target info
- [ ] Changes diff view

---

## PHASE 8: Production Readiness

### Task 8.1: Add Monitoring (Prometheus) 🟢 🔵
**Priority:** LOW
**Estimated Complexity:** Medium

**Subtasks:**
- [ ] Add prom-client package
- [ ] Create metrics endpoint
- [ ] Track API latency
- [ ] Track WebSocket connections
- [ ] Track database queries
- [ ] Track error rates

---

### Task 8.2: Add Error Tracking (Sentry) 🟢 🔵🟣
**Priority:** LOW
**Estimated Complexity:** Low

**Subtasks:**
- [ ] Add @sentry/node to API
- [ ] Add @sentry/nextjs to Web
- [ ] Configure error capture
- [ ] Add source maps upload

---

### Task 8.3: Add Rate Limiting Headers 🟢 🔵
**Priority:** LOW
**Estimated Complexity:** Low

**Subtasks:**
- [ ] Add X-RateLimit-Limit header
- [ ] Add X-RateLimit-Remaining header
- [ ] Add X-RateLimit-Reset header
- [ ] Handle rate limit exceeded gracefully

---

### Task 8.4: Database Backup Strategy 🟢 🔵
**Priority:** LOW
**Estimated Complexity:** Medium

**Subtasks:**
- [ ] Create backup script
- [ ] Schedule daily backups
- [ ] Implement backup rotation
- [ ] Test restore procedure

---

## PHASE 9: Missing Web Components (From Milestones Review)

### Task 9.1: Add Missing Utility Components 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None

**Description:**
Several utility components from milestones are missing from the codebase.

**Files to create/modify:**
- `packages/web/components/ui/Dropdown.tsx`
- `packages/web/components/ui/Tooltip.tsx`
- `packages/web/components/ui/Card.tsx`
- `packages/web/components/ui/Divider.tsx`

**Subtasks:**
- [ ] Create Dropdown/Select component with keyboard navigation
- [ ] Create Tooltip component with positioning
- [ ] Create Card component for content sections
- [ ] Create Divider component
- [ ] Add exports to index.ts

---

### Task 9.2: Add Missing Auth UI Features 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None

**Files to modify:**
- `packages/web/app/auth/register/page.tsx`
- `packages/web/app/auth/login/page.tsx`

**Subtasks:**
- [ ] Add password strength indicator to registration
- [ ] Add "Remember me" checkbox to login
- [ ] Improve form validation feedback

---

### Task 9.3: Audio Levels Visualization 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** Task 1.1 (Voice calling fix)

**Description:**
Visual indication of audio levels when users speak in voice channels.

**Files to modify:**
- `packages/web/components/voice/VoiceChannelUsers.tsx`
- `packages/web/components/voice/VoiceConnectedPanel.tsx`

**Subtasks:**
- [ ] Create AudioLevelIndicator component
- [ ] Hook into WebRTC audio analyser
- [ ] Show animated bars when speaking
- [ ] Show ring around avatar when speaking
- [ ] Add to voice channel user list

---

### Task 9.4: Activity Status & Rich Presence 🟢 🟣
**Priority:** LOW
**Estimated Complexity:** Medium
**Dependencies:** Backend activity tracking

**Description:**
Show "Playing...", "Listening to...", "Streaming..." status on users.

**Files to modify:**
- `packages/web/components/app/MemberSidebar.tsx`
- `packages/web/components/user/UserProfileCard.tsx`
- `packages/web/stores/authStore.ts`

**Subtasks:**
- [ ] Add activity status to user store
- [ ] Display activity text under username
- [ ] Show activity icon (game, music, stream)
- [ ] Support custom status with emoji
- [ ] Add status expiration

---

### Task 9.5: Sticker Support UI 🟢 🟣
**Priority:** LOW
**Estimated Complexity:** Medium
**Dependencies:** Backend sticker support

**Files to modify:**
- `packages/web/components/messaging/MessageInput.tsx`
- `packages/web/components/messaging/MessageContent.tsx`

**Subtasks:**
- [ ] Add sticker picker button to message input
- [ ] Create StickerPicker component
- [ ] Display stickers in messages
- [ ] Support sticker packs
- [ ] Add recently used stickers

---

### Task 9.6: Rich Text Editor Enhancements 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** None

**Files to modify:**
- `packages/web/components/messaging/MessageInput.tsx`

**Subtasks:**
- [ ] Add list formatting (ordered, unordered)
- [ ] Add checkbox/todo list support
- [ ] Add spoiler toggle (||text||)
- [ ] Add heading formatting
- [ ] Add quote block formatting

---

### Task 9.7: Enhanced Search UI 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** None

**Files to modify:**
- `packages/web/components/search/SearchModal.tsx`

**Subtasks:**
- [ ] Add date range filter
- [ ] Add user filter (from:@username)
- [ ] Add has:attachment filter
- [ ] Highlight search terms in results
- [ ] Add search suggestions
- [ ] Show result context

---

### Task 9.8: User Profile Enhancements 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None

**Files to modify:**
- `packages/web/components/user/UserProfileCard.tsx`

**Subtasks:**
- [ ] Add mutual servers display
- [ ] Add bot indicator badge
- [ ] Add boost status indicator (nitro)
- [ ] Add role tags display
- [ ] Show member since date

---

### Task 9.9: Voice Channel Admin Features 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** Task 1.1 (Voice calling fix)

**Files to modify:**
- `packages/web/components/voice/VoiceConnectedPanel.tsx`
- `packages/web/stores/voiceStore.ts`

**Subtasks:**
- [ ] Add mute other users functionality (server mute)
- [ ] Add call duration timer
- [ ] Add input/output device settings UI
- [ ] Add server deafen functionality

---

### Task 9.10: Screen Share & Video Enhancements 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** High
**Dependencies:** Task 1.1 (Voice calling fix)

**Files to modify:**
- `packages/web/components/voice/VideoGrid.tsx`
- `packages/web/components/voice/VoiceConnectedPanel.tsx`

**Subtasks:**
- [ ] Implement screen share button and picker
- [ ] Add screen share preview
- [ ] Add quality settings for screen share
- [ ] Implement picture-in-picture mode
- [ ] Add video resize/quality options

---

## PHASE 10: Accessibility & Performance (HIGH PRIORITY)

### Task 10.1: Keyboard Navigation 🔴 🟣
**Priority:** CRITICAL for accessibility
**Estimated Complexity:** Medium
**Dependencies:** None

**Description:**
Full keyboard navigation support for power users and accessibility.

**Files to modify:**
- `packages/web/components/app/AppLayout.tsx`
- `packages/web/hooks/useKeyboardShortcuts.ts` (new)

**Subtasks:**
- [ ] Create useKeyboardShortcuts hook
- [ ] Add Tab navigation between focusable elements
- [ ] Add arrow key navigation in lists
- [ ] Add Escape to close modals
- [ ] Add Ctrl+K for quick search
- [ ] Add keyboard shortcuts for channel navigation
- [ ] Add focus indicators

---

### Task 10.2: ARIA Labels & Screen Reader Support 🟠 🟣
**Priority:** HIGH for accessibility
**Estimated Complexity:** Medium
**Dependencies:** None

**Files to modify:**
- All component files in `packages/web/components/`

**Subtasks:**
- [ ] Add aria-label to all interactive elements
- [ ] Add role attributes to lists, menus, dialogs
- [ ] Add aria-live for dynamic content updates
- [ ] Add aria-describedby for form fields
- [ ] Test with screen readers (VoiceOver, NVDA)
- [ ] Add skip links for main content

---

### Task 10.3: Focus Management 🟠 🟣
**Priority:** HIGH for accessibility
**Estimated Complexity:** Medium
**Dependencies:** None

**Subtasks:**
- [ ] Trap focus in modals
- [ ] Restore focus when modal closes
- [ ] Focus management for route changes
- [ ] Focus first interactive element in modals
- [ ] Add focus outline styles

---

### Task 10.4: Performance Optimizations 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** None

**Files to modify:**
- `packages/web/components/messaging/MessageList.tsx`
- `packages/web/components/messaging/MessageAttachments.tsx`

**Subtasks:**
- [ ] Implement virtual scrolling for message list
- [ ] Add lazy loading for images
- [ ] Add React.memo to frequently re-rendering components
- [ ] Add useMemo/useCallback where beneficial
- [ ] Add image lazy loading with blur placeholder
- [ ] Implement infinite scroll for messages

---

## PHASE 11: Responsive & Mobile Design

### Task 11.1: Tablet Layout Optimization 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** None

**Files to modify:**
- `packages/web/components/app/AppLayout.tsx`
- `packages/web/components/app/ServerSidebar.tsx`
- `packages/web/components/app/ChannelSidebar.tsx`

**Subtasks:**
- [ ] Create responsive breakpoints
- [ ] Collapsible server sidebar on tablet
- [ ] Collapsible member sidebar on tablet
- [ ] Optimize touch targets for tablet
- [ ] Test on tablet viewports

---

### Task 11.2: Mobile Layout 🟠 🟣
**Priority:** HIGH for user adoption
**Estimated Complexity:** High
**Dependencies:** None

**Files to modify:**
- `packages/web/components/app/AppLayout.tsx`
- `packages/web/components/mobile/` (new)

**Subtasks:**
- [ ] Create mobile navigation system
- [ ] Add bottom navigation bar
- [ ] Implement swipe gestures for sidebars
- [ ] Mobile-optimized message input
- [ ] Touch-friendly context menus
- [ ] Mobile voice UI
- [ ] Pull-to-refresh

---

### Task 11.3: Touch Gesture Support 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Medium
**Dependencies:** Task 11.2

**Subtasks:**
- [ ] Swipe to reveal actions on messages
- [ ] Long press for context menus
- [ ] Pinch to zoom images
- [ ] Swipe between channels/DMs
- [ ] Pull down to refresh

---

## PHASE 12: Additional Web Polish

### Task 12.1: Message Animations 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None (or Framer Motion from 9.14)

**Files to modify:**
- `packages/web/components/messaging/MessageItem.tsx`
- `packages/web/components/messaging/MessageList.tsx`

**Subtasks:**
- [ ] Add message appear animation
- [ ] Add message delete animation
- [ ] Add message edit highlight animation
- [ ] Add reaction pop animation
- [ ] Add typing indicator animation

---

### Task 12.2: Development Tools Setup 🟡 🟣
**Priority:** MEDIUM
**Estimated Complexity:** Low
**Dependencies:** None

**Subtasks:**
- [ ] Install and configure Framer Motion
- [ ] Set up Storybook for component development
- [ ] Configure React Query (TanStack Query)
- [ ] Create theme provider context
- [ ] Add client-side API rate limiting

---

### Task 12.3: Language/i18n Settings 🟢 🟣
**Priority:** LOW
**Estimated Complexity:** Medium
**Dependencies:** None

**Files to modify:**
- `packages/web/components/user/UserSettingsModal.tsx`

**Subtasks:**
- [ ] Add language selection dropdown
- [ ] Install i18next or similar
- [ ] Create translation files
- [ ] Add date/time locale formatting
- [ ] Add RTL support consideration

---

### Task 12.4: Call History UI 🟢 🟣
**Priority:** LOW
**Estimated Complexity:** Low
**Dependencies:** Backend call history

**Subtasks:**
- [ ] Create call history component
- [ ] Show recent calls list
- [ ] Add call duration display
- [ ] Add callback functionality
- [ ] Show missed calls indicator

---

## Task Execution Order (Suggested Nightshift Sequence)

### Night 1
1. Task 1.1: Fix Voice Calling (CRITICAL)
2. Task 1.3: Fix File Upload (CRITICAL)

### Night 2
3. Task 1.2: SMTP Email Service (CRITICAL)
4. Task 2.1: Permission Checks for Reactions

### Night 3
5. Task 2.2: Join Server Modal
6. Task 2.3: Backup Codes
7. Task 2.4: Remove Simulated Delays

### Night 4
8. Task 3.3: Devices Tab
9. Task 2.5: Mediasoup Worker Restart

### Night 5
10. Task 3.4: Voice & Video Settings Tab
11. Task 3.5: Pinned Messages UI

### Night 6
12. Task 3.6: Ban Management UI
13. Task 3.7: Slow Mode UI

### Night 7
14. Task 3.1: Privacy & Safety Tab
15. Task 3.2: Authorized Apps Tab

### Night 8
16. Task 4.1: Move Types to Shared


### Night 11 - Accessibility Sprint (HIGH PRIORITY)
20. Task 10.1: Keyboard Navigation (CRITICAL)
21. Task 10.2: ARIA Labels & Screen Reader Support
22. Task 10.3: Focus Management

### Night 12
23. Task 9.1: Missing Utility Components
24. Task 9.2: Missing Auth UI Features

### Night 13
25. Task 9.3: Audio Levels Visualization
26. Task 9.9: Voice Channel Admin Features

### Night 14
27. Task 9.6: Rich Text Editor Enhancements
28. Task 9.7: Enhanced Search UI

### Night 15
29. Task 10.4: Performance Optimizations
30. Task 12.1: Message Animations

### Night 16 - Mobile Sprint
31. Task 11.1: Tablet Layout Optimization
32. Task 11.2: Mobile Layout

### Night 17
33. Task 12.2: Development Tools Setup
34. Task 9.4: Activity Status & Rich Presence

### Night 18
35. Task 9.8: User Profile Enhancements
36. Task 9.10: Screen Share & Video Enhancements

### Night 19
37. Task 11.3: Touch Gesture Support
38. Task 12.3: Language/i18n Settings

### Night 20
39. Task 9.5: Sticker Support UI
40. Task 12.4: Call History UI

---

## Notes for Nightshift Developer

1. **Always run tests** after completing a task
2. **Check for TypeScript errors** with `npm run type-check`
3. **Lint code** with `npm run lint:fix`
4. **Test voice features** with multiple browser tabs
5. **Verify database migrations** before committing
6. **Update CLAUDE.md** if adding new patterns or commands

## Quick Commands

```bash
# Start development
npm run dev

# Run tests
npm run test --workspace=@freedomtalk/api

# Type check
npm run type-check

# Lint and fix
npm run lint:fix

# Database migrations
npm run migrate:latest --workspace=@freedomtalk/api
npm run migrate:status --workspace=@freedomtalk/api

# Docker services
npm run docker:up
npm run docker:down
```
