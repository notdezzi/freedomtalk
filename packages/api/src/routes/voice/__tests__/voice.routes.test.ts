/**
 * Voice Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fastify from 'fastify';
import voiceRoutes from '../index';

// Mock services
vi.mock('../../../services/voice/voice-state.service', () => ({
  voiceStateService: {
    createVoiceState: vi.fn(),
    getVoiceState: vi.fn(),
    deleteVoiceState: vi.fn(),
    updateVoiceState: vi.fn(),
    getChannelVoiceStates: vi.fn(),
    getUserVoiceState: vi.fn(),
    kickFromVoiceChannel: vi.fn(),
    moveUserToChannel: vi.fn(),
    setMute: vi.fn(),
    setDeaf: vi.fn(),
    getChannelStreams: vi.fn(),
  }
}));

vi.mock('../../../services/channel/channel.service', () => ({
  channelService: {
    getChannel: vi.fn(),
  }
}));

vi.mock('../../../middleware/auth.middleware', () => ({
  authenticate: async (req: any) => {
    req.user = { id: 'test-user', userId: 'test-user', username: 'testuser' };
  }
}));

import { voiceStateService } from '../../../services/voice/voice-state.service';
import { channelService } from '../../../services/channel/channel.service';

describe('Voice Routes', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    app = fastify();
    await app.register(voiceRoutes, { prefix: '/voice' });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /channels/:channelId/join', () => {
    it('should return 400 for invalid channel type', async () => {
      vi.mocked(channelService.getChannel).mockResolvedValue({
        id: 'ch-1',
        type: 'text',
        server_id: 's-1'
      } as any);

      const response = await request(app.server)
        .post('/voice/channels/ch-1/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('voice channel');
    });

    it('should join voice channel successfully', async () => {
      vi.mocked(channelService.getChannel).mockResolvedValue({
        id: 'ch-1',
        type: 'voice',
        server_id: 's-1'
      } as any);

      vi.mocked(voiceStateService.getUserVoiceState).mockResolvedValue(null);
      vi.mocked(voiceStateService.createVoiceState).mockResolvedValue({
        id: 'vs-1',
        channel_id: 'ch-1',
        user_id: 'test-user',
        server_id: 's-1',
        session_id: 'session-1'
      } as any);

      const response = await request(app.server)
        .post('/voice/channels/ch-1/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
    });
  });

  describe('POST /channels/:channelId/leave', () => {
    it('should leave voice channel successfully', async () => {
      vi.mocked(voiceStateService.getUserVoiceState).mockResolvedValue({
        id: 'vs-1',
        channel_id: 'ch-1',
        user_id: 'test-user',
        server_id: 's-1',
        session_id: 'session-1'
      } as any);

      vi.mocked(voiceStateService.deleteVoiceState).mockResolvedValue(undefined);

      const response = await request(app.server)
        .post('/voice/channels/ch-1/leave')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if not in voice channel', async () => {
      vi.mocked(voiceStateService.getUserVoiceState).mockResolvedValue(null);

      const response = await request(app.server)
        .post('/voice/channels/ch-1/leave')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /channels/:channelId', () => {
    it('should return voice states for channel', async () => {
      vi.mocked(voiceStateService.getChannelVoiceStates).mockResolvedValue([
        { id: 'vs-1', channel_id: 'ch-1', user_id: 'u-1', session_id: 's-1' }
      ] as any);

      const response = await request(app.server)
        .get('/voice/channels/ch-1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PATCH /sessions/:sessionId/state', () => {
    it('should update voice state', async () => {
      vi.mocked(voiceStateService.getVoiceState).mockResolvedValue({
        id: 'vs-1',
        channel_id: 'ch-1',
        user_id: 'test-user',
        session_id: 'session-1'
      } as any);

      vi.mocked(voiceStateService.updateVoiceState).mockResolvedValue({
        id: 'vs-1',
        self_mute: true,
        self_deaf: false
      } as any);

      const response = await request(app.server)
        .patch('/voice/sessions/session-1/state')
        .send({ selfMute: true, selfDeaf: false })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      vi.mocked(voiceStateService.getVoiceState).mockResolvedValue(null);

      const response = await request(app.server)
        .patch('/voice/sessions/non-existent/state')
        .send({ selfMute: true })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /sessions/:sessionId/move', () => {
    it('should move user to another channel', async () => {
      vi.mocked(voiceStateService.moveUserToChannel).mockResolvedValue({
        id: 'vs-1',
        channel_id: 'ch-2'
      } as any);

      const response = await request(app.server)
        .post('/voice/sessions/session-1/move')
        .send({ targetChannelId: 'ch-2' })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /sessions/:sessionId/mute', () => {
    it('should mute user', async () => {
      vi.mocked(voiceStateService.setMute).mockResolvedValue({
        id: 'vs-1',
        self_mute: true
      } as any);

      const response = await request(app.server)
        .patch('/voice/sessions/session-1/mute')
        .send({ mute: true })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /sessions/:sessionId/deafen', () => {
    it('should deafen user', async () => {
      vi.mocked(voiceStateService.setDeaf).mockResolvedValue({
        id: 'vs-1',
        self_deaf: true
      } as any);

      const response = await request(app.server)
        .patch('/voice/sessions/session-1/deafen')
        .send({ deaf: true })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /sessions/:sessionId/kick', () => {
    it('should kick user from voice channel', async () => {
      vi.mocked(voiceStateService.kickFromVoiceChannel).mockResolvedValue(undefined);

      const response = await request(app.server)
        .delete('/voice/sessions/session-1/kick')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /channels/:channelId/streams', () => {
    it('should return active streams', async () => {
      vi.mocked(voiceStateService.getChannelStreams).mockResolvedValue([
        { sessionId: 's-1', userId: 'u-1', hasVideo: true, hasScreenShare: false }
      ] as any);

      const response = await request(app.server)
        .get('/voice/channels/ch-1/streams')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
