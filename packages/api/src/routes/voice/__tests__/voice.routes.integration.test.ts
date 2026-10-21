/**
 * Voice Routes Integration Tests (behavioral)
 *
 * Exercises the real route handlers through app.inject(): join
 * authorization (membership, CONNECT, channel type, bans), session
 * ownership on state updates, and the permission gates on the admin
 * operations (mute/kick). No mediasoup worker is involved — the media
 * layer calls are no-ops for participants that never joined the SFU.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../../../app';
import { FastifyInstance } from 'fastify';
import { db } from '../../../config/database';

const PASSWORD = 'SecurePass123!';

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

async function createTestUser(app: FastifyInstance, suffix: string): Promise<TestUser> {
  const email = `test-voice-${suffix}@example.com`;
  const username = `testvoice_${suffix}`;

  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { username, email, password: PASSWORD },
  });
  if (registerResponse.statusCode !== 201) {
    throw new Error(`Registration failed: ${registerResponse.body}`);
  }
  const userId = JSON.parse(registerResponse.body).data.userId;

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: PASSWORD },
  });
  if (loginResponse.statusCode !== 200) {
    throw new Error(`Login failed: ${loginResponse.body}`);
  }

  return { id: userId, email, accessToken: JSON.parse(loginResponse.body).data.accessToken };
}

async function authedInject(
  app: FastifyInstance,
  user: TestUser,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: object
) {
  return app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${user.accessToken}` },
    ...(payload !== undefined ? { payload } : {}),
  });
}

describe('Voice Routes (behavioral)', () => {
  let app: FastifyInstance;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let serverId: string;
  let voiceChannelId: string;
  let textChannelId: string;

  beforeAll(async () => {
    app = await build({ skipRateLimit: true });

    owner = await createTestUser(app, 'owner');
    member = await createTestUser(app, 'member');
    outsider = await createTestUser(app, 'out');

    const serverResponse = await authedInject(app, owner, 'POST', '/api/v1/servers', {
      name: 'Voice Test Server',
    });
    expect(serverResponse.statusCode).toBe(201);
    serverId = JSON.parse(serverResponse.body).data.id;

    const voiceResponse = await authedInject(app, owner, 'POST', `/api/v1/servers/${serverId}/channels`, {
      name: 'voice-test',
      type: 'voice',
    });
    expect(voiceResponse.statusCode).toBe(201);
    voiceChannelId = JSON.parse(voiceResponse.body).data.id;

    const textResponse = await authedInject(app, owner, 'POST', `/api/v1/servers/${serverId}/channels`, {
      name: 'text-test',
      type: 'text',
    });
    expect(textResponse.statusCode).toBe(201);
    textChannelId = JSON.parse(textResponse.body).data.id;

    // member joins via invite; outsider never does
    const inviteResponse = await authedInject(app, owner, 'POST', `/api/v1/servers/${serverId}/invites`, {});
    expect(inviteResponse.statusCode).toBeLessThan(400);
    const inviteCode = JSON.parse(inviteResponse.body).data.code;

    const joinResponse = await authedInject(app, member, 'POST', '/api/v1/servers/join', { inviteCode });
    expect(joinResponse.statusCode).toBeLessThan(400);
  });

  afterAll(async () => {
    await db('voice_states').whereIn('channel_id', [voiceChannelId, textChannelId]).del();
    await db('server_bans').where('server_id', serverId).del();
    await db('invites').where('server_id', serverId).del();
    await db('member_roles').where('server_id', serverId).del();
    await db('server_members').where('server_id', serverId).del();
    await db('roles').where('server_id', serverId).del();
    await db('channels').whereIn('id', [voiceChannelId, textChannelId]).del();
    await db('servers').where('id', serverId).del();
    await db('users').whereIn('id', [owner.id, member.id, outsider.id]).del();
    await app.close();
  });

  describe('POST /voice/channels/:channelId/join', () => {
    it('rejects a non-member before any permission check', async () => {
      const response = await authedInject(app, outsider, 'POST', `/api/v1/voice/channels/${voiceChannelId}/join`);
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error.code).toBe('FORBIDDEN');
    });

    it('rejects joining a non-voice channel', async () => {
      const response = await authedInject(app, owner, 'POST', `/api/v1/voice/channels/${textChannelId}/join`);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error.code).toBe('INVALID_CHANNEL_TYPE');
    });

    it('lets a member join and lists them in the channel', async () => {
      const join = await authedInject(app, member, 'POST', `/api/v1/voice/channels/${voiceChannelId}/join`);
      expect(join.statusCode).toBe(200);
      const { sessionId } = JSON.parse(join.body).data;
      expect(sessionId).toBeTruthy();

      const users = await authedInject(app, owner, 'GET', `/api/v1/voice/channels/${voiceChannelId}`);
      expect(users.statusCode).toBe(200);
      const userIds = JSON.parse(users.body).data.users.map((u: { user_id: string }) => u.user_id);
      expect(userIds).toContain(member.id);
    });

    it('rejects a banned member (ban revokes membership)', async () => {
      // Leave first so the earlier test's state does not interfere
      await authedInject(app, member, 'POST', `/api/v1/voice/channels/${voiceChannelId}/leave`);

      const ban = await authedInject(app, owner, 'POST', `/api/v1/servers/${serverId}/bans/${member.id}`, {
        reason: 'voice test ban',
      });
      expect(ban.statusCode).toBeLessThan(400);

      const join = await authedInject(app, member, 'POST', `/api/v1/voice/channels/${voiceChannelId}/join`);
      expect(join.statusCode).toBe(403);
    });
  });

  describe('PATCH /voice/sessions/:sessionId/state', () => {
    let ownerSessionId: string;

    beforeAll(async () => {
      const join = await authedInject(app, owner, 'POST', `/api/v1/voice/channels/${voiceChannelId}/join`);
      ownerSessionId = JSON.parse(join.body).data.sessionId;
    });

    afterAll(async () => {
      await authedInject(app, owner, 'POST', `/api/v1/voice/channels/${voiceChannelId}/leave`);
    });

    it("rejects updates to someone else's session", async () => {
      const response = await authedInject(app, member, 'PATCH', `/api/v1/voice/sessions/${ownerSessionId}/state`, {
        selfMute: true,
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error.message).toBe('Not your voice session');
    });

    it('lets the owner update their own session', async () => {
      const response = await authedInject(app, owner, 'PATCH', `/api/v1/voice/sessions/${ownerSessionId}/state`, {
        selfMute: true,
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.self_mute).toBe(true);
    });

    it('rejects an unknown session', async () => {
      const response = await authedInject(app, owner, 'PATCH', '/api/v1/voice/sessions/000000000000000000/state', {
        selfMute: true,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('admin operations (mute/kick)', () => {
    let memberSessionId: string;

    beforeAll(async () => {
      // member is banned by the earlier test — unban by deleting the ban row,
      // re-add via a fresh invite so permission tests run with a member present
      await db('server_bans').where({ server_id: serverId, user_id: member.id }).del();
      const inviteResponse = await authedInject(app, owner, 'POST', `/api/v1/servers/${serverId}/invites`, {});
      const inviteCode = JSON.parse(inviteResponse.body).data.code;
      await authedInject(app, member, 'POST', '/api/v1/servers/join', { inviteCode });

      const join = await authedInject(app, member, 'POST', `/api/v1/voice/channels/${voiceChannelId}/join`);
      memberSessionId = JSON.parse(join.body).data.sessionId;
    });

    afterAll(async () => {
      await authedInject(app, member, 'POST', `/api/v1/voice/channels/${voiceChannelId}/leave`);
    });

    it("rejects a member without MUTE_MEMBERS muting someone else's session", async () => {
      const ownerJoin = await authedInject(app, owner, 'POST', `/api/v1/voice/channels/${voiceChannelId}/join`);
      const ownerSessionId = JSON.parse(ownerJoin.body).data.sessionId;

      const muteOwner = await authedInject(app, member, 'PATCH', `/api/v1/voice/sessions/${ownerSessionId}/mute`, {
        suppress: true,
      });
      expect(muteOwner.statusCode).toBe(403);

      await authedInject(app, owner, 'POST', `/api/v1/voice/channels/${voiceChannelId}/leave`);
    });

    it('lets the owner (implicit permission) mute the member', async () => {
      const response = await authedInject(app, owner, 'PATCH', `/api/v1/voice/sessions/${memberSessionId}/mute`, {
        suppress: true,
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.suppress).toBe(true);
    });

    it("rejects a member without MOVE_MEMBERS kicking someone else's session", async () => {
      const ownerJoin = await authedInject(app, owner, 'POST', `/api/v1/voice/channels/${voiceChannelId}/join`);
      const ownerSessionId = JSON.parse(ownerJoin.body).data.sessionId;

      const kick = await authedInject(app, member, 'DELETE', `/api/v1/voice/sessions/${ownerSessionId}/kick`);
      expect(kick.statusCode).toBe(403);

      await authedInject(app, owner, 'POST', `/api/v1/voice/channels/${voiceChannelId}/leave`);
    });

    it('lets the owner kick the member from voice', async () => {
      const kick = await authedInject(app, owner, 'DELETE', `/api/v1/voice/sessions/${memberSessionId}/kick`);
      expect(kick.statusCode).toBe(204);

      const users = await authedInject(app, owner, 'GET', `/api/v1/voice/channels/${voiceChannelId}`);
      const userIds = JSON.parse(users.body).data.users.map((u: { user_id: string }) => u.user_id);
      expect(userIds).not.toContain(member.id);
    });

    it('rejects admin operations for an unknown session', async () => {
      const mute = await authedInject(app, owner, 'PATCH', '/api/v1/voice/sessions/000000000000000000/mute', {
        suppress: true,
      });
      expect(mute.statusCode).toBe(404);

      const kick = await authedInject(app, owner, 'DELETE', '/api/v1/voice/sessions/000000000000000000/kick');
      expect(kick.statusCode).toBe(404);
    });
  });
});
