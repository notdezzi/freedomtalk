# Phase 4: Voice & Video Design

**Date:** 2026-02-17
**Status:** Approved
**Scope:** Voice channels, video calls, screen sharing

## Overview

Implement real-time voice and video communication using Mediasoup SFU (Selective Forwarding Unit). The architecture separates the API server (signaling) from the Media server (WebRTC transport).

## Architecture

```
┌─────────────────┐     WebSocket Signaling     ┌─────────────────┐
│   API Server    │◄──────────────────────────►│  Media Server   │
│   (Fastify)     │     Redis Pub/Sub           │   (Mediasoup)   │
│   Port 3001     │                             │   Port 3002     │
└────────┬────────┘                             └────────┬────────┘
         │                                               │
    ┌────▼────┐                                   ┌─────▼─────┐
    │  Redis  │                                   │  Mediasoup│
    │         │                                   │  Workers  │
    └─────────┘                                   └───────────┘
```

### Components

1. **API Server** - Handles REST endpoints, WebSocket signaling, room management
2. **Media Server** - Separate process running mediasoup, handles WebRTC transport
3. **Redis** - Coordination between API and Media servers via pub/sub

## Database Schema

### voice_states table

```sql
CREATE TABLE voice_states (
  id VARCHAR(20) PRIMARY KEY,
  channel_id VARCHAR(20) NOT NULL REFERENCES channels(id),
  user_id VARCHAR(20) NOT NULL REFERENCES users(id),
  server_id VARCHAR(20) NOT NULL REFERENCES servers(id),
  session_id VARCHAR(50) NOT NULL,
  self_mute BOOLEAN DEFAULT false,
  self_deaf BOOLEAN DEFAULT false,
  self_video BOOLEAN DEFAULT false,
  self_stream BOOLEAN DEFAULT false,
  suppress BOOLEAN DEFAULT false,
  request_to_speak_timestamp TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id),
  UNIQUE(session_id)
);

CREATE INDEX idx_voice_states_channel ON voice_states(channel_id);
CREATE INDEX idx_voice_states_user ON voice_states(user_id);
CREATE INDEX idx_voice_states_server ON voice_states(server_id);
```

## API Endpoints

### REST Endpoints

```
POST   /api/v1/voice/channels/:channelId/join      - Join voice channel
POST   /api/v1/voice/channels/:channelId/leave     - Leave voice channel
GET    /api/v1/voice/channels/:channelId           - Get voice state
PATCH  /api/v1/voice/sessions/:sessionId/state     - Update mute/deaf/video
POST   /api/v1/voice/sessions/:sessionId/move      - Move to different channel

# Administration
PATCH  /api/v1/voice/sessions/:sessionId/mute     - Server mute
PATCH  /api/v1/voice/sessions/:sessionId/deafen   - Server deafen
DELETE /api/v1/voice/sessions/:sessionId/kick     - Kick from voice

# Screen Sharing
POST   /api/v1/voice/sessions/:sessionId/stream/start   - Start screen share
POST   /api/v1/voice/sessions/:sessionId/stream/stop    - Stop screen share
GET    /api/v1/voice/channels/:channelId/streams        - List active streams
```

### WebSocket Events

**Client → API Server:**
```
voice:join              - Request to join voice channel
voice:leave             - Leave voice channel
voice:state_update      - Mute/deaf/video state changed
voice:speaking          - Speaking indicator

# WebRTC Signaling (proxied to Media Server)
voice:get_router_rtp_capabilities
voice:create_webrtc_transport
voice:connect_webrtc_transport
voice:produce
voice:consume
voice:resume_consumer
voice:close_producer
voice:close_consumer
```

**API Server → Client:**
```
voice:user_joined               - Someone joined
voice:user_left                 - Someone left
voice:user_state_updated        - State changed
voice:user_speaking             - Speaking indicator
voice:router_rtp_capabilities   - Media server capabilities
voice:transport_created         - WebRTC transport info
voice:producer_created          - Producer info
voice:consumer_created          - Consumer info
```

## Media Server Design

### Directory Structure

```
packages/api/src/services/voice/
├── media-server.ts          # Separate process entry point
├── mediasoup.service.ts     # Mediasoup wrapper
├── voice-state.service.ts   # Voice state management
├── voice-room.ts            # Voice room abstraction
├── signaling.handler.ts     # Redis signaling handler
└── __tests__/
    └── voice.integration.test.ts
```

### Mediasoup Configuration

- **Workers:** One per CPU core (configurable)
- **Routers:** One per voice channel
- **Transports:** Send and receive per participant
- **Codecs:**
  - Audio: OPUS (48kHz, stereo, DTX, FEC)
  - Video: VP9 (primary), VP8 (fallback), H264 (fallback)
  - Screen: VP9 with higher bitrate

### Voice Room Lifecycle

1. First user joins → Create mediasoup Router
2. User creates WebRTC transports (send/receive)
3. User produces audio/video tracks
4. Other users consume tracks via receive transports
5. Last user leaves → Close Router, cleanup room

## Voice Administration

### Permissions

- `MUTE_MEMBERS` - Server mute/deafen
- `MOVE_MEMBERS` - Move users between channels
- `DEAFEN_MEMBERS` - Server deafen
- `MANAGE_CHANNELS` - Kick from voice

### Voice State Model

```typescript
interface VoiceState {
  channelId: string;
  userId: string;
  sessionId: string;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;
  suppress: boolean;
  requestToSpeakTimestamp?: Date;
}
```

## Screen Sharing

### Features

- One screen share per user
- Optional system audio
- Quality: 720p, 1080p (configurable)
- Separate video producer for screen

### Stream Types

```typescript
type StreamType = 'camera' | 'screen' | 'screen-audio';

interface MediaProducer {
  id: string;
  kind: 'audio' | 'video';
  type: StreamType;
  paused: boolean;
}
```

## Limits

- Max 25 users per voice channel
- Max 1 screen share per user
- Max 2 video producers per user (camera + screen)
- Default bitrate: 64kbps, max: 128kbps

## Configuration

### Environment Variables

```
# Media Server
MEDIASOUP_ANNOUNCED_IP=your.public.ip
MEDIASOUP_WORKERS=2
MEDIASOUP_LISTEN_PORT_RANGE=10000-20000
MEDIASOUP_RTC_MIN_PORT=40000
MEDIASOUP_RTC_MAX_PORT=49999

# Voice
VOICE_MAX_USERS_PER_CHANNEL=25
VOICE_BITRATE_DEFAULT=64000
VOICE_BITRATE_MAX=128000
```

### npm Packages

```json
{
  "mediasoup": "^3.14.0",
  "mediasoup-client": "^3.7.0"
}
```

## File Structure

```
packages/api/src/
├── services/voice/
│   ├── media-server.ts
│   ├── mediasoup.service.ts
│   ├── voice-state.service.ts
│   ├── voice-room.ts
│   ├── signaling.handler.ts
│   └── __tests__/
├── routes/voice/
│   └── index.ts
├── migrations/
│   └── 20260217_create_voice_states_table.ts
└── scripts/
    └── start-media.ts
```

## Deployment

### Process Management

- API server and Media server run as separate processes
- Docker Compose includes both services
- Both share Redis for coordination

### Startup Scripts

```bash
npm run dev:api      # Start API server
npm run dev:media    # Start Media server
npm run dev          # Start both (development)
```

## Milestones

1. **4.1 Voice Channels & Connection** - Database, state management, basic join/leave
2. **4.2 Voice Administration** - Mute, deafen, kick, move users
3. **4.3 Media Server Setup** - Mediasoup integration, WebRTC signaling
4. **4.4 Video & Screen Share** - Camera, screen sharing with audio
