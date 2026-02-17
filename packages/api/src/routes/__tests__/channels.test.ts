/**
 * Channel Routes Integration Tests
 * Tests for Phase 3: Channels, Categories, Roles, and Permissions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../app';
import { FastifyInstance } from 'fastify';
import { db } from '../../config/database';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';

interface TestUser {
  id: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
}

async function createTestUser(app: FastifyInstance, suffix: string): Promise<TestUser> {
  const email = `test-channel-${suffix}@example.com`;
  const username = `testchannel-${suffix}`;

  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      username,
      email,
      password: 'SecurePass123!',
    },
  });

  if (registerResponse.statusCode !== 201) {
    throw new Error(`Registration failed: ${registerResponse.body}`);
  }

  const registerBody = JSON.parse(registerResponse.body);

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email,
      password: 'SecurePass123!',
    },
  });

  if (loginResponse.statusCode !== 200) {
    throw new Error(`Login failed: ${loginResponse.body}`);
  }

  const loginBody = JSON.parse(loginResponse.body);

  return {
    id: registerBody.data.userId,
    email,
    username,
    accessToken: loginBody.data.accessToken,
    refreshToken: loginBody.data.refreshToken,
  };
}

async function createTestServer(app: FastifyInstance, accessToken: string, name: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/servers',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    payload: {
      name,
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Server creation failed: ${response.body}`);
  }

  return JSON.parse(response.body).data.id;
}

describe('Channel Routes', () => {
  let app: FastifyInstance;
  let testUser: TestUser;
  let secondUser: TestUser;
  let testServerId: string;

  beforeAll(async () => {
    app = await build({ skipRateLimit: true });
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup all test data
    await db('permission_overwrites').del();
    await db('member_roles').del();
    await db('roles').where('name', 'like', '%test%').orWhere('name', 'like', 'Test%').del();
    await db('channels').where('name', 'like', '%test%').orWhere('name', 'like', 'Test%').del();
    await db('channel_categories').where('name', 'like', '%test%').orWhere('name', 'like', 'Test%').del();
    await db('server_members').del();
    await db('server_bans').del();
    await db('invites').del();
    await db('servers').where('name', 'like', '%Test Channel%').del();

    if (testUser?.id) {
      await db('user_profiles').where({ user_id: testUser.id }).del();
      await db('users').where({ id: testUser.id }).del();
    }
    if (secondUser?.id) {
      await db('user_profiles').where({ user_id: secondUser.id }).del();
      await db('users').where({ id: secondUser.id }).del();
    }

    await app.close();
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testUser = await createTestUser(app, `ch-${timestamp}`);
    secondUser = await createTestUser(app, `ch2-${timestamp}`);
    testServerId = await createTestServer(app, testUser.accessToken, 'Test Channel Server');
  });

  describe('Categories', () => {
    it('should create a category', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/categories`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Category',
          position: 0,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Category');
      expect(body.data.position).toBe(0);
    });

    it('should list categories', async () => {
      // Create category first
      await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/categories`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Category List',
          position: 0,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${testServerId}/categories`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should update a category', async () => {
      // Create category
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/categories`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Category Update',
          position: 0,
        },
      });

      const categoryId = JSON.parse(createResponse.body).data.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Updated Category Name',
          position: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Category Name');
      expect(body.data.position).toBe(1);
    });

    it('should delete a category', async () => {
      // Create category
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/categories`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Category Delete',
          position: 0,
        },
      });

      const categoryId = JSON.parse(createResponse.body).data.id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('Channels', () => {
    it('should create a text channel', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'test-text-channel',
          type: 'text',
          topic: 'Test topic',
          nsfw: false,
          rateLimitPerUser: 10,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('test-text-channel');
      expect(body.data.type).toBe('text');
      expect(body.data.topic).toBe('Test topic');
      expect(body.data.nsfw).toBe(false);
      expect(body.data.rate_limit_per_user).toBe(10);
    });

    it('should create a voice channel', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Voice Channel',
          type: 'voice',
          bitrate: 64000,
          userLimit: 10,
          rtcRegion: 'us-east',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Voice Channel');
      expect(body.data.type).toBe('voice');
      expect(body.data.bitrate).toBe(64000);
      expect(body.data.user_limit).toBe(10);
      expect(body.data.rtc_region).toBe('us-east');
    });

    it('should create an announcement channel', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Announcement',
          type: 'announcement',
          topic: 'Announcements go here',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Announcement');
      expect(body.data.type).toBe('announcement');
    });

    it('should list server channels', async () => {
      // Create a channel
      await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'test-list-channels',
          type: 'text',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // Should have at least the #general channel and our new channel
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should create channel in category', async () => {
      // Create category first
      const categoryResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/categories`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Category With Channel',
          position: 0,
        },
      });

      const categoryId = JSON.parse(categoryResponse.body).data.id;

      // Create channel in category
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'test-channel-in-category',
          type: 'text',
          categoryId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.category_id).toBe(categoryId);
    });

    it('should update channel positions', async () => {
      // Create two channels
      const ch1Response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'test-position-1',
          type: 'text',
        },
      });

      const ch2Response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${testServerId}/channels`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'test-position-2',
          type: 'text',
        },
      });

      const ch1Id = JSON.parse(ch1Response.body).data.id;
      const ch2Id = JSON.parse(ch2Response.body).data.id;

      // Swap positions
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${testServerId}/channels/positions`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          positions: [
            { id: ch1Id, position: 5 },
            { id: ch2Id, position: 4 },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});

describe('Role Routes', () => {
  let app: FastifyInstance;
  let testUser: TestUser;
  let testServerId: string;

  beforeAll(async () => {
    app = await build({ skipRateLimit: true });
    await app.ready();
  });

  afterAll(async () => {
    await db('member_roles').del();
    await db('roles').where('name', 'like', 'Test%').del();
    await db('server_members').del();
    await db('servers').where('name', 'like', '%Test Role%').del();

    if (testUser?.id) {
      await db('user_profiles').where({ user_id: testUser.id }).del();
      await db('users').where({ id: testUser.id }).del();
    }

    await app.close();
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testUser = await createTestUser(app, `role-${timestamp}`);
    testServerId = await createTestServer(app, testUser.accessToken, 'Test Role Server');
  });

  it('should create a role', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Moderator',
        color: 0x5865F2,
        hoist: true,
        mentionable: true,
        permissions: PERMISSION_FLAGS.MANAGE_MESSAGES.toString(),
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Test Moderator');
    expect(body.data.color).toBe(0x5865F2);
    expect(body.data.hoist).toBe(true);
    expect(body.data.mentionable).toBe(true);
  });

  it('should list roles', async () => {
    // Create role
    await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Role List',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Should have @everyone and our custom role
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should update a role', async () => {
    // Create role
    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Role Update',
      },
    });

    const roleId = JSON.parse(createResponse.body).data.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/servers/${testServerId}/roles/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Updated Role Name',
        color: 0xFF0000,
        hoist: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated Role Name');
    expect(body.data.color).toBe(0xFF0000);
    expect(body.data.hoist).toBe(true);
  });

  it('should delete a role', async () => {
    // Create role
    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Role Delete',
      },
    });

    const roleId = JSON.parse(createResponse.body).data.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/servers/${testServerId}/roles/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should assign role to member', async () => {
    // Create role
    const roleResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Assign Role',
      },
    });

    const roleId = JSON.parse(roleResponse.body).data.id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/servers/${testServerId}/members/${testUser.id}/roles/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should remove role from member', async () => {
    // Create role
    const roleResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Remove Role',
      },
    });

    const roleId = JSON.parse(roleResponse.body).data.id;

    // Assign role first
    await app.inject({
      method: 'PUT',
      url: `/api/v1/servers/${testServerId}/members/${testUser.id}/roles/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    });

    // Remove role
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/servers/${testServerId}/members/${testUser.id}/roles/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(204);
  });
});

describe('Permission Routes', () => {
  let app: FastifyInstance;
  let testUser: TestUser;
  let testServerId: string;
  let testChannelId: string;

  beforeAll(async () => {
    app = await build({ skipRateLimit: true });
    await app.ready();
  });

  afterAll(async () => {
    await db('permission_overwrites').del();
    await db('member_roles').del();
    await db('roles').where('name', 'like', 'Test%').del();
    await db('channels').where('name', 'like', 'test-perm%').del();
    await db('server_members').del();
    await db('servers').where('name', 'like', '%Test Perm%').del();

    if (testUser?.id) {
      await db('user_profiles').where({ user_id: testUser.id }).del();
      await db('users').where({ id: testUser.id }).del();
    }

    await app.close();
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testUser = await createTestUser(app, `perm-${timestamp}`);
    testServerId = await createTestServer(app, testUser.accessToken, 'Test Perm Server');

    // Create a test channel
    const channelResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/channels`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'test-perm-channel',
        type: 'text',
      },
    });

    testChannelId = JSON.parse(channelResponse.body).data.id;
  });

  it('should create a permission overwrite', async () => {
    // Create a role first
    const roleResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Perm Role',
      },
    });

    const roleId = JSON.parse(roleResponse.body).data.id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/channels/${testChannelId}/permissions/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        type: 'role',
        allow: PERMISSION_FLAGS.VIEW_CHANNEL.toString(),
        deny: PERMISSION_FLAGS.SEND_MESSAGES.toString(),
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.target_id).toBe(roleId);
    expect(body.data.target_type).toBe('role');
  });

  it('should list permission overwrites', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/channels/${testChannelId}/permissions`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('should update a permission overwrite', async () => {
    // Create role
    const roleResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Update Perm Role',
      },
    });

    const roleId = JSON.parse(roleResponse.body).data.id;

    // Create overwrite
    await app.inject({
      method: 'PUT',
      url: `/api/v1/channels/${testChannelId}/permissions/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        type: 'role',
        allow: PERMISSION_FLAGS.VIEW_CHANNEL.toString(),
      },
    });

    // Update overwrite
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/channels/${testChannelId}/permissions/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        allow: PERMISSION_FLAGS.SEND_MESSAGES.toString(),
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should delete a permission overwrite', async () => {
    // Create role
    const roleResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/servers/${testServerId}/roles`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        name: 'Test Delete Perm Role',
      },
    });

    const roleId = JSON.parse(roleResponse.body).data.id;

    // Create overwrite
    await app.inject({
      method: 'PUT',
      url: `/api/v1/channels/${testChannelId}/permissions/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: {
        type: 'role',
        allow: PERMISSION_FLAGS.VIEW_CHANNEL.toString(),
      },
    });

    // Delete overwrite
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/channels/${testChannelId}/permissions/${roleId}`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should check user permission', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/channels/${testChannelId}/permissions/check`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      query: {
        permission: PERMISSION_FLAGS.VIEW_CHANNEL.toString(),
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    // Owner should have all permissions
    expect(body.data.has_permission).toBe(true);
  });
});
