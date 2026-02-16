import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../app';
import { db } from '../../config/database';
describe('User Routes', () => {
    let app;
    let testUserId;
    let accessToken;
    beforeAll(async () => {
        app = await build({ skipRateLimit: true });
        await app.ready();
    });
    afterAll(async () => {
        if (testUserId) {
            await db('user_profiles').where({ user_id: testUserId }).del();
            await db('users').where({ id: testUserId }).del();
        }
        await app.close();
    });
    beforeEach(async () => {
        const existingUsers = await db('users')
            .where({ email: 'test@example.com' })
            .orWhere({ username: 'testuser' })
            .select('id');
        if (existingUsers.length > 0) {
            await db('user_profiles').whereIn('user_id', existingUsers.map(u => u.id)).del();
        }
        await db('users').where({ email: 'test@example.com' }).orWhere({ username: 'testuser' }).del();
        const registerResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/register',
            payload: {
                username: 'testuser',
                email: 'test@example.com',
                password: 'SecurePass123!',
            },
        });
        if (registerResponse.statusCode !== 201) {
            throw new Error(`Registration failed with status ${registerResponse.statusCode}: ${registerResponse.body}`);
        }
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: {
                email: 'test@example.com',
                password: 'SecurePass123!',
            },
        });
        if (loginResponse.statusCode !== 200) {
            throw new Error(`Login failed with status ${loginResponse.statusCode}: ${loginResponse.body}`);
        }
        const loginBody = JSON.parse(loginResponse.body);
        testUserId = loginBody.data.user.id;
        accessToken = loginBody.data.accessToken;
    });
    describe('GET /api/v1/users/@me', () => {
        it('should get current user profile', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/users/@me',
                headers: {
                    authorization: `Bearer ${accessToken}`,
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(testUserId);
            expect(body.data.username).toBe('testuser');
            expect(body.data.email).toBe('test@example.com');
            expect(body.data.profile).toBeDefined();
            expect(body.data.profile.displayName).toBe('testuser');
        });
        it('should reject request without auth token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/users/@me',
            });
            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error.code).toBe('UNAUTHORIZED');
        });
        it('should reject request with invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/users/@me',
                headers: {
                    authorization: 'Bearer invalid-token',
                },
            });
            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
        });
    });
    describe('PUT /api/v1/users/@me', () => {
        it('should update user profile successfully', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/users/@me',
                headers: {
                    authorization: `Bearer ${accessToken}`,
                },
                payload: {
                    display_name: 'Test User Updated',
                    bio: 'This is my updated bio',
                    pronouns: 'they/them',
                    custom_status: 'Working on tests',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.profile.displayName).toBe('Test User Updated');
            expect(body.data.profile.bio).toBe('This is my updated bio');
            expect(body.data.profile.pronouns).toBe('they/them');
            expect(body.data.profile.customStatus).toBe('Working on tests');
            const profile = await db('user_profiles').where({ user_id: testUserId }).first();
            expect(profile.display_name).toBe('Test User Updated');
            expect(profile.bio).toBe('This is my updated bio');
        });
        it('should reject invalid avatar URL', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/users/@me',
                headers: {
                    authorization: `Bearer ${accessToken}`,
                },
                payload: {
                    avatar_url: 'not-a-valid-url',
                },
            });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error.code).toBe('VALIDATION_ERROR');
        });
        it('should reject request without auth token', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/users/@me',
                payload: {
                    display_name: 'Test User',
                },
            });
            expect(response.statusCode).toBe(401);
        });
    });
});
//# sourceMappingURL=users.test.js.map