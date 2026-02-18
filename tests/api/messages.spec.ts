/**
 * API Messages Tests
 * Direct HTTP tests for message endpoints
 */

import { test, expect } from '@playwright/test';
import { createTestUser, createTestServer, createTestMessage } from '../utils/test-data';

const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Messages API', () => {
  let authCookie: string;
  let testServerId: string;
  let testChannelId: string;

  test.beforeAll(async ({ request }) => {
    // Register and login a test user
    const user = createTestUser();
    await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email: user.email,
        username: user.username,
        password: user.password,
        confirmPassword: user.password,
      },
    });

    const loginResponse = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: user.email,
        password: user.password,
      },
    });

    authCookie = loginResponse.headers()['set-cookie'] || '';

    // Create a test server
    const serverResponse = await request.post(`${API_URL}/api/v1/servers`, {
      headers: { Cookie: authCookie },
      data: { name: createTestServer().name },
    });

    if (serverResponse.ok()) {
      const serverBody = await serverResponse.json();
      testServerId = serverBody.data?.id;

      // Get channels for the server
      if (testServerId) {
        const channelsResponse = await request.get(`${API_URL}/api/v1/servers/${testServerId}/channels`, {
          headers: { Cookie: authCookie },
        });

        if (channelsResponse.ok()) {
          const channelsBody = await channelsResponse.json();
          const channels = channelsBody.data?.channels || channelsBody.data || [];
          if (channels.length > 0) {
            testChannelId = channels[0].id;
          }
        }
      }
    }
  });

  test.describe('GET /api/v1/servers/:serverId/channels/:channelId/messages', () => {
    test('should return messages for channel', async ({ request }) => {
      if (!testServerId || !testChannelId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages`,
        { headers: { Cookie: authCookie } }
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body.data) || Array.isArray(body.data?.messages)).toBeTruthy();
    });

    test('should return 401 when not authenticated', async ({ request }) => {
      if (!testServerId || !testChannelId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages`
      );

      expect(response.status()).toBe(401);
    });

    test('should return 404 for non-existent channel', async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/v1/servers/${testServerId}/channels/00000000000000000000/messages`,
        { headers: { Cookie: authCookie } }
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe('POST /api/v1/servers/:serverId/channels/:channelId/messages', () => {
    test('should create a message', async ({ request }) => {
      if (!testServerId || !testChannelId) {
        test.skip();
        return;
      }

      const message = createTestMessage();

      const response = await request.post(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages`,
        {
          headers: { Cookie: authCookie },
          data: { content: message },
        }
      );

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.data.content).toBe(message);
    });

    test('should reject empty message', async ({ request }) => {
      if (!testServerId || !testChannelId) {
        test.skip();
        return;
      }

      const response = await request.post(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages`,
        {
          headers: { Cookie: authCookie },
          data: { content: '' },
        }
      );

      expect(response.status()).toBe(400);
    });
  });

  test.describe('PATCH /api/v1/servers/:serverId/channels/:channelId/messages/:messageId', () => {
    test('should edit own message', async ({ request }) => {
      if (!testServerId || !testChannelId) {
        test.skip();
        return;
      }

      // Create a message first
      const createResponse = await request.post(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages`,
        {
          headers: { Cookie: authCookie },
          data: { content: createTestMessage() },
        }
      );

      const createBody = await createResponse.json();
      const messageId = createBody.data?.id;

      if (!messageId) {
        test.skip();
        return;
      }

      // Edit the message
      const editResponse = await request.patch(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages/${messageId}`,
        {
          headers: { Cookie: authCookie },
          data: { content: 'Edited message content' },
        }
      );

      expect(editResponse.status()).toBe(200);
    });
  });

  test.describe('DELETE /api/v1/servers/:serverId/channels/:channelId/messages/:messageId', () => {
    test('should delete own message', async ({ request }) => {
      if (!testServerId || !testChannelId) {
        test.skip();
        return;
      }

      // Create a message first
      const createResponse = await request.post(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages`,
        {
          headers: { Cookie: authCookie },
          data: { content: createTestMessage() },
        }
      );

      const createBody = await createResponse.json();
      const messageId = createBody.data?.id;

      if (!messageId) {
        test.skip();
        return;
      }

      // Delete the message
      const deleteResponse = await request.delete(
        `${API_URL}/api/v1/servers/${testServerId}/channels/${testChannelId}/messages/${messageId}`,
        { headers: { Cookie: authCookie } }
      );

      expect(deleteResponse.status()).toBe(200);
    });
  });
});
