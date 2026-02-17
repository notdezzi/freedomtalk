import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../app';
import { db } from '../../config/database';
async function createTestUser(app, suffix) {
    const email = `test-${suffix}@example.com`;
    const username = `testuser-${suffix}`;
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
describe('Server Routes', () => {
    let app;
    let testUser;
    let secondUser;
    let testServerId;
    beforeAll(async () => {
        app = await build({ skipRateLimit: true });
        await app.ready();
    });
    afterAll(async () => {
        await db('permission_overwrites').del();
        await db('member_roles').del();
        await db('roles').where('name', 'like', '%test%').del();
        await db('channels').where('name', 'like', '%test%').del();
        await db('channel_categories').where('name', 'like', '%test%').del();
        await db('server_members').del();
        await db('server_bans').del();
        await db('invites').del();
        await db('servers').where('name', 'like', '%Test Server%').del();
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
        testUser = await createTestUser(app, `server-${timestamp}`);
        secondUser = await createTestUser(app, `server2-${timestamp}`);
    });
    describe('Server CRUD Operations', () => {
        it('should create a new server successfully', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server 1',
                    description: 'A test server for testing',
                },
            });
            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.name).toBe('Test Server 1');
            expect(body.data.description).toBe('A test server for testing');
            expect(body.data.owner_id).toBe(testUser.id);
            testServerId = body.data.id;
        });
        it('should auto-create @everyone role and #general channel on server creation', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Auto',
                },
            });
            const serverId = JSON.parse(createResponse.body).data.id;
            const rolesResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}/roles`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            const roles = JSON.parse(rolesResponse.body).data;
            expect(roles.length).toBeGreaterThan(0);
            expect(roles[0].name).toBe('@everyone');
            const channelsResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}/channels`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            const channels = JSON.parse(channelsResponse.body).data;
            expect(channels.length).toBeGreaterThan(0);
            expect(channels[0].name).toBe('general');
        });
        it('should get server details', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Get',
                },
            });
            const serverId = JSON.parse(createResponse.body).data.id;
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(serverId);
            expect(body.data.name).toBe('Test Server Get');
        });
        it('should update server settings', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Update',
                },
            });
            const serverId = JSON.parse(createResponse.body).data.id;
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/servers/${serverId}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Updated Server Name',
                    description: 'Updated description',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.name).toBe('Updated Server Name');
            expect(body.data.description).toBe('Updated description');
        });
        it('should delete server (owner only)', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Delete',
                },
            });
            const serverId = JSON.parse(createResponse.body).data.id;
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/servers/${serverId}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(204);
            const getResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(getResponse.statusCode).toBe(404);
        });
        it('should reject delete from non-owner', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Owner',
                },
            });
            const serverId = JSON.parse(createResponse.body).data.id;
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/servers/${serverId}`,
                headers: {
                    authorization: `Bearer ${secondUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(403);
        });
        it('should get user servers', async () => {
            await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server List 1',
                },
            });
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/users/@me/servers',
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
    });
    describe('Server Members', () => {
        let serverId;
        beforeEach(async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Members',
                },
            });
            serverId = JSON.parse(createResponse.body).data.id;
        });
        it('should list server members', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}/members`,
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
        it('should update member nickname', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/servers/${serverId}/members/${testUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    nickname: 'New Nickname',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.nickname).toBe('New Nickname');
        });
        it('should allow member to leave server', async () => {
            const inviteResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            const inviteCode = JSON.parse(inviteResponse.body).data.code;
            await app.inject({
                method: 'POST',
                url: `/api/v1/invites/${inviteCode}`,
                headers: {
                    authorization: `Bearer ${secondUser.accessToken}`,
                },
            });
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/servers/${serverId}/members/@me`,
                headers: {
                    authorization: `Bearer ${secondUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(204);
        });
        it('should kick member from server', async () => {
            const inviteResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            const inviteCode = JSON.parse(inviteResponse.body).data.code;
            await app.inject({
                method: 'POST',
                url: `/api/v1/invites/${inviteCode}`,
                headers: {
                    authorization: `Bearer ${secondUser.accessToken}`,
                },
            });
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/servers/${serverId}/members/${secondUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(204);
        });
    });
    describe('Server Invites', () => {
        let serverId;
        beforeEach(async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Invites',
                },
            });
            serverId = JSON.parse(createResponse.body).data.id;
        });
        it('should create an invite', async () => {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.code).toBeDefined();
            expect(body.data.code.length).toBe(8);
            expect(body.data.max_uses).toBe(10);
            expect(body.data.max_age).toBe(3600);
        });
        it('should get invite by code', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            const inviteCode = JSON.parse(createResponse.body).data.code;
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/invites/${inviteCode}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.code).toBe(inviteCode);
        });
        it('should join server via invite', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            const inviteCode = JSON.parse(createResponse.body).data.code;
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/invites/${inviteCode}`,
                headers: {
                    authorization: `Bearer ${secondUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            const membersResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}/members`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            const members = JSON.parse(membersResponse.body).data;
            expect(members.find((m) => m.user_id === secondUser.id)).toBeDefined();
        });
        it('should list server invites', async () => {
            await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}/invites`,
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
        it('should delete invite', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            const inviteCode = JSON.parse(createResponse.body).data.code;
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/invites/${inviteCode}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(204);
            const getResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/invites/${inviteCode}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(getResponse.statusCode).toBe(404);
        });
    });
    describe('Server Bans', () => {
        let serverId;
        beforeEach(async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/servers',
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    name: 'Test Server Bans',
                },
            });
            serverId = JSON.parse(createResponse.body).data.id;
        });
        it('should ban a user from server', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/servers/${serverId}/bans/${secondUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    reason: 'Test ban reason',
                },
            });
            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.reason).toBe('Test ban reason');
        });
        it('should list server bans', async () => {
            await app.inject({
                method: 'PUT',
                url: `/api/v1/servers/${serverId}/bans/${secondUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    reason: 'Test ban',
                },
            });
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}/bans`,
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
        it('should unban a user', async () => {
            await app.inject({
                method: 'PUT',
                url: `/api/v1/servers/${serverId}/bans/${secondUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    reason: 'Test ban',
                },
            });
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/servers/${serverId}/bans/${secondUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(204);
            const getResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/servers/${serverId}/bans/${secondUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
            });
            expect(getResponse.statusCode).toBe(404);
        });
        it('should prevent banned user from joining', async () => {
            await app.inject({
                method: 'PUT',
                url: `/api/v1/servers/${serverId}/bans/${secondUser.id}`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    reason: 'Test ban',
                },
            });
            const inviteResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/servers/${serverId}/invites`,
                headers: {
                    authorization: `Bearer ${testUser.accessToken}`,
                },
                payload: {
                    max_uses: 10,
                    max_age: 3600,
                },
            });
            const inviteCode = JSON.parse(inviteResponse.body).data.code;
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/invites/${inviteCode}`,
                headers: {
                    authorization: `Bearer ${secondUser.accessToken}`,
                },
            });
            expect(response.statusCode).toBe(403);
        });
    });
});
//# sourceMappingURL=servers.test.js.map