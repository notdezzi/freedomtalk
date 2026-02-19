# Voice Channel Integration Design

**Date:** 2026-02-19
**Status:** Approved

## Overview

Integrate voice channel functionality into the FreedomTalk UI, connecting existing backend infrastructure (mediasoup SFU, WebSocket handlers) to the frontend.

## Requirements

- Join voice channel immediately on click (auto media permissions, auto SFU setup)
- Voice channels are state-based, not route-based (no refresh in voice)
- Grid-based view for users in voice
- Users listed below voice channel in sidebar
- Green ring around avatar when speaking
- Uniform grid tiles (video appears in user's tile, same size)
- Control bars in both main view and sidebar
- Members column hidden when in voice

## Architecture

### Core Principle: Voice as State, Not Route

Voice channels are NOT URL-navigable. The URL stays at the current text channel while voice state changes the UI.

- Click voice channel → Join voice, URL unchanged
- Voice store `isConnected` + `currentChannelId` determines view
- Page refresh → Voice disconnected, user lands on text channel
- `lastTextChannelId` tracks where to return after leaving voice

### Data Flow

```
User clicks voice channel
    ↓
NavigationColumn calls voiceClient.joinChannel(channelId)
    ↓
VoiceClient runs SFU steps 1-5 automatically:
  1. voice:join → get sessionId + rtpCapabilities
  2. Create Device, load capabilities
  3. Create send transport
  4. Create recv transport
  5. Start consuming + auto-start audio
    ↓
VoiceStore updated with connection state
    ↓
ChannelPage checks voiceStore.isConnected
    ↓
Renders VoiceGridView instead of MessageView
```

## Components

### 1. VoiceGridView

Grid display of users in voice channel.

**Layout:**
- Responsive CSS grid (2-4 columns based on participant count)
- Uniform tile size for all users

**Tile Contents:**
- Avatar (with green ring when speaking)
- Username
- Video element (visible when user has video on)
- Screen share video (overlays tile when sharing)
- Mute/deafen icon overlays

**States:**
- Audio-only: Avatar + speaking ring
- Video on: Video stream replaces avatar
- Screen sharing: Screen stream + small avatar corner

### 2. VoiceControls

Control bar for main view.

**Buttons:**
| Button | Action |
|--------|--------|
| Mute | `voiceClient.setMuted(!selfMute)` |
| Deafen | Toggle `selfDeaf`, mute remote audio |
| Video | `voiceClient.startVideo()` / `stopVideo()` |
| Screen | `voiceClient.startScreenShare()` / `stopScreenShare()` |
| Leave | `voiceClient.leaveChannel()` |

**Layout:**
- Full-width bar at bottom of voice grid
- Buttons centered, Leave on far right (red)

### 3. VoicePanel (Updated)

Sidebar control bar - already exists, needs wiring.

**Changes:**
- Wire buttons to actual VoiceClient methods
- Show only when connected to voice
- Display current channel name

### 4. useVoiceConnection Hook

Manages VoiceClient lifecycle and socket connection.

**Responsibilities:**
- Create/maintain VoiceClient instance
- Connect voice store callbacks to VoiceClient events
- Handle socket connection state
- Cleanup on unmount

## Layout Changes

### AppShell

Conditional members column:

```tsx
// When voice connected
<div className={cn(
  'flex-1 overflow-hidden',
  voiceConnected ? 'w-full' : (membersOpen ? 'w-[50%]' : 'w-[75%]')
)}>
  {children}
</div>
{!voiceConnected && <MembersColumn />}
```

### NavigationColumn

Voice channel handling:

1. Detect channel type (text vs voice)
2. On voice channel click:
   - Call `joinVoiceChannel(channelId)`
   - Do NOT navigate
3. Show users in voice channel below channel name
4. Highlight active voice channel with green accent

### ChannelPage

Conditional rendering:

```tsx
const isConnected = useVoiceStore(s => s.isConnected);
const voiceChannelId = useVoiceStore(s => s.currentChannelId);

if (isConnected && voiceChannelId) {
  return <VoiceGridView />;
}

return <MessageView ... />;
```

## Audio Level Detection

### Speaking Indicator

Use Web Audio API `AnalyserNode`:

1. Create audio context for each stream
2. Get byte frequency data
3. Threshold detection: > 30% volume = speaking
4. Debounce 300ms to prevent flickering

### Event Flow

```
Local audio detected
    ↓
VoiceClient emits voice:speaking to server
    ↓
Server broadcasts voice:user_speaking to room
    ↓
Other clients update voiceStore.users[].speaking
    ↓
UI shows green ring
```

### Visual Style

```css
.speaking {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.5);
  ring: 2px solid rgb(34, 197, 94);
  transition: all 200ms ease;
}
```

## Files

### Create

| File | Purpose |
|------|---------|
| `components/voice/voice-grid-view.tsx` | Grid display of voice users |
| `components/voice/voice-controls.tsx` | Main view control bar |
| `hooks/use-voice-connection.ts` | Voice connection lifecycle hook |

### Modify

| File | Changes |
|------|---------|
| `components/layout/app-shell.tsx` | Hide members column when in voice |
| `components/layout/navigation-column.tsx` | Voice click handler, show users in channel |
| `app/servers/[serverId]/channels/[channelId]/page.tsx` | Conditional voice/message view |
| `components/voice/voice-panel.tsx` | Wire controls to VoiceClient |
| `lib/voice-client.ts` | Add speaking detection |
| `components/voice/index.ts` | Export new components |

## Existing Infrastructure (No Changes Needed)

- `packages/api/src/services/voice/mediasoup.service.ts` - SFU service
- `packages/api/src/services/websocket/handlers/voice.handler.ts` - WebSocket handlers
- `packages/api/src/routes/voice/index.ts` - REST routes
- `packages/web/stores/voice-store.ts` - State management
- `packages/web/lib/voice-client.ts` - WebRTC client (minor additions)

## Success Criteria

1. Click voice channel → Instantly join with audio
2. See all users in voice in grid view
3. Green ring appears around speaking users
4. Video/screen share shows in user's tile
5. Controls work (mute/deafen/video/screen/leave)
6. Members column hidden when in voice
7. Page refresh returns to text channel view
8. Users shown below voice channel in sidebar
