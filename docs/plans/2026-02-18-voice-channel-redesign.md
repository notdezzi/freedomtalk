# Voice Channel Redesign

**Date:** 2026-02-18
**Status:** Approved

## Overview

Rebuild the voice channel system to follow Discord's UX pattern with dedicated voice views, proper mediasoup integration, and a clean architecture based on the proven SFU debug page patterns.

## Goals

- Voice channels navigate to a dedicated voice view with video grid
- Video grid shows profile pictures by default, video when camera enabled
- Text channels remain accessible while in voice
- Auto-execute connection steps (1-5) + audio when joining
- Auto video production when enabling camera
- Voice controls in both sidebar and voice view
- Single-click channel entry (no separate join button)

## Architecture

### 1. Voice Client (`voice-client.ts`)

Refactored to follow SFU page patterns:

```typescript
class VoiceClient {
  // Core state
  private socket: Socket | null = null;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;

  // Producers
  private audioProducer: Producer | null = null;
  private videoProducer: Producer | null = null;
  private screenProducer: Producer | null = null;

  // Consumers mapped by producerId
  private consumers: Map<string, Consumer> = new Map();

  // Local streams
  private localAudioStream: MediaStream | null = null;
  private localVideoStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;

  // Session state
  private channelId: string | null = null;
  private sessionId: string | null = null;
  private rtpCapabilities: RtpCapabilities | null = null;

  // Connection flow
  async joinChannel(channelId: string): Promise<void>;
  async leaveChannel(): Promise<void>;

  // Media operations
  async enableVideo(): Promise<void>;
  async disableVideo(): Promise<void>;
  async enableScreenShare(): Promise<void>;
  async disableScreenShare(): Promise<void>;

  // Mute/deafen
  setMuted(muted: boolean): void;
  setDeafened(deafened: boolean): void;

  // Getters
  getRemoteStreams(): Map<string, { audio?: MediaStream; video?: MediaStream; screen?: MediaStream }>;
  getLocalAudioStream(): MediaStream | null;
  getLocalVideoStream(): MediaStream | null;
  getLocalScreenStream(): MediaStream | null;
}
```

### 2. Voice Store (`voiceStore.ts`)

```typescript
interface VoiceUser {
  userId: string;
  sessionId: string;
  username: string;
  avatarUrl?: string;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;
  speaking: boolean;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
  screenStream?: MediaStream;
}

interface VoiceState {
  // Connection state
  isConnected: boolean;
  currentChannelId: string | null;
  currentServerId: string | null;
  sessionId: string | null;

  // Own state
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;

  // Local streams
  localAudioStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  localScreenStream: MediaStream | null;

  // Remote users
  users: VoiceUser[];

  // Device settings
  audioInput: string | null;
  audioOutput: string | null;
  videoInput: string | null;

  // Cross-channel states for sidebar
  channelStates: Map<string, VoiceUser[]>;
}
```

### 3. UI Components

#### VideoGrid (existing, minor updates)
- Accept `VoiceUser[]` with streams
- Wire up audio/video elements with autoPlay
- Show speaking indicator when `speaking: true`
- Profile picture fallback when no video

#### VoiceConnectedPanel (existing, updates)
- Add video/screen toggle buttons
- Wire to voiceStore actions
- Show participant count

#### VoiceChannelView (new)
```typescript
export function VoiceChannelView({ channelId, serverId }: Props) {
  // Combine local + remote users for VideoGrid
  // Render header, VideoGrid, VoiceConnectedPanel
}
```

### 4. Routing

**Channel Page** (`app/servers/[serverId]/channels/[channelId]/page.tsx`):
- Check channel type
- Voice → `<VoiceChannelView />`
- Text → `<MessageList />` + `<MessageInput />`

**ChannelSidebar:**
- Voice channel click → join AND navigate
- Remove separate VoiceJoinButton
- Show connected users as avatar stack
- Highlight active voice channel

## Connection Flow

### Join Flow
1. `voice:join` → Get sessionId, rtpCapabilities, existingProducers
2. Create Device → `device.load({ routerRtpCapabilities })`
3. Create Send Transport → Setup connect/produce handlers
4. Create Recv Transport → Setup connect handler
5. Start Consuming → Consume existing producers, attach streams
6. Auto Get Local Audio → `getUserMedia({ audio })` with selected device
7. Auto Produce Audio → `sendTransport.produce({ track })`

### Enable Video Flow
1. `getUserMedia({ video: { deviceId } })`
2. `sendTransport.produce({ track })`
3. Update store: `selfVideo = true`, `localVideoStream = stream`

### New Producer Event (remote)
1. `voice:new_producer` socket event
2. `voice:consume` → `recvTransport.consume()` → `voice:resume_consumer`
3. `updateUserStream(userId, 'video', stream)`
4. VideoGrid updates

### Leave Flow
1. Close all producers, consumers, transports
2. Stop all local tracks
3. `voice:leave` socket emit
4. Reset store

## Files to Modify

### Core
- `packages/web/lib/voice-client.ts` - Refactor to SFU patterns
- `packages/web/stores/voiceStore.ts` - Add stream management

### Components
- `packages/web/components/voice/VideoGrid.tsx` - Minor updates
- `packages/web/components/voice/VoiceConnectedPanel.tsx` - Wire to store
- `packages/web/components/voice/VoiceChannelView.tsx` - New component

### Routing
- `packages/web/app/servers/[serverId]/channels/[channelId]/page.tsx` - Type-based routing
- `packages/web/components/app/ChannelSidebar.tsx` - Voice click handler
- `packages/web/components/app/SidebarWrapper.tsx` - Keep voice panel

### Cleanup
- Remove `packages/web/components/voice/VoiceJoinButton.tsx` (no longer needed)

## Success Criteria

1. Clicking a voice channel joins and shows voice view
2. Profile pictures shown by default in VideoGrid
3. Enabling camera shows video in grid
4. Audio automatically works when joining
5. Controls work in both sidebar and voice view
6. Can navigate to text channels while in voice
7. Clicking active voice channel returns to voice view
8. Leaving voice properly cleans up all resources
