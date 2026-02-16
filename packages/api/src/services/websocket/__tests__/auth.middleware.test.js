import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticateSocket } from '../auth.middleware';
import { jwtService } from '../../auth/jwt.service';
import { db } from '../../../config/database';
import { WS_EVENTS } from '@freedomtalk/shared';
vi.mock('../../auth/jwt.service');
vi.mock('../../../config/database');
vi.mock('../../../config/logger', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));
describe('AuthMiddleware', () => {
    let mockSocket;
    let mockNext;
    beforeEach(() => {
        vi.clearAllMocks();
        mockSocket = {
            id: 'test-socket-id',
            handshake: {
                auth: {},
                headers: {},
                query: {},
            },
            data: {},
            emit: vi.fn(),
        };
        mockNext = vi.fn();
    });
    describe('Token Extraction', () => {
        it('should extract token from auth.token (recommended)', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(jwtService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockSocket.data.user).toBeDefined();
        });
        it('should extract token from Authorization header', async () => {
            mockSocket.handshake.headers = { authorization: 'Bearer valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(jwtService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should extract token from query parameter', async () => {
            mockSocket.handshake.query = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(jwtService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should fail when token is missing', async () => {
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_MISSING',
                message: 'Authentication token required',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
        });
        it('should fail when Authorization header has invalid format', async () => {
            mockSocket.handshake.headers = { authorization: 'InvalidFormat token' };
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_MISSING',
                message: 'Authentication token required',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
        });
        it('should fail when Authorization header is missing token part', async () => {
            mockSocket.handshake.headers = { authorization: 'Bearer ' };
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_MISSING',
                message: 'Authentication token required',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
        });
    });
    describe('Token Validation', () => {
        it('should successfully validate valid token', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockSocket.data.user).toEqual({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                emailVerified: true,
                mfaEnabled: false,
                accountStatus: 'active',
            });
        });
        it('should fail when token is invalid', async () => {
            mockSocket.handshake.auth = { token: 'invalid-token' };
            vi.mocked(jwtService.verifyToken).mockRejectedValue(new Error('Invalid token'));
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_INVALID',
                message: 'Invalid or expired authentication token',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Invalid or expired authentication token'));
        });
        it('should fail when token is expired', async () => {
            mockSocket.handshake.auth = { token: 'expired-token' };
            vi.mocked(jwtService.verifyToken).mockRejectedValue(new Error('Token expired'));
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_INVALID',
                message: 'Invalid or expired authentication token',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Invalid or expired authentication token'));
        });
        it('should fail when token is malformed', async () => {
            mockSocket.handshake.auth = { token: 'malformed.token' };
            vi.mocked(jwtService.verifyToken).mockRejectedValue(new Error('Malformed token'));
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_INVALID',
                message: 'Invalid or expired authentication token',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Invalid or expired authentication token'));
        });
    });
    describe('User Extraction', () => {
        it('should extract user from database successfully', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: true,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(db).toHaveBeenCalledWith('users');
            expect(mockSocket.data.user).toEqual({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                emailVerified: true,
                mfaEnabled: true,
                accountStatus: 'active',
            });
        });
        it('should fail when user not found in database', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'non-existent-user' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue(null),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('User not found'));
        });
        it('should fail when database query throws error', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockRejectedValue(new Error('Database error')),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('User not found'));
        });
    });
    describe('Account Status Validation', () => {
        it('should allow active accounts', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockSocket.data.user?.accountStatus).toBe('active');
        });
        it('should reject suspended accounts', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'suspended',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'ACCOUNT_INACTIVE',
                message: 'Account is suspended',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Account is suspended'));
        });
        it('should reject banned accounts', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'banned',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'ACCOUNT_INACTIVE',
                message: 'Account is banned',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Account is banned'));
        });
        it('should reject deleted accounts', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'deleted',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'ACCOUNT_INACTIVE',
                message: 'Account is deleted',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Account is deleted'));
        });
    });
    describe('Error Handling', () => {
        it('should handle unexpected errors gracefully', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockRejectedValue(new Error('Unexpected error'));
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_INVALID',
                message: 'Invalid or expired authentication token',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Invalid or expired authentication token'));
        });
        it('should emit authentication error before calling next', async () => {
            mockSocket.handshake.auth = { token: 'invalid-token' };
            vi.mocked(jwtService.verifyToken).mockRejectedValue(new Error('Invalid token'));
            const emitSpy = vi.spyOn(mockSocket, 'emit');
            await authenticateSocket(mockSocket, mockNext);
            expect(emitSpy).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
            const emitCallOrder = emitSpy.mock.invocationCallOrder?.[0];
            const nextCallOrder = mockNext.mock.invocationCallOrder?.[0];
            if (emitCallOrder !== undefined && nextCallOrder !== undefined) {
                expect(emitCallOrder).toBeLessThan(nextCallOrder);
            }
        });
    });
    describe('Edge Cases', () => {
        it('should handle query token as array (invalid)', async () => {
            mockSocket.handshake.query = { token: ['token1', 'token2'] };
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_MISSING',
                message: 'Authentication token required',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
        });
        it('should prioritize auth.token over other sources', async () => {
            mockSocket.handshake.auth = { token: 'auth-token' };
            mockSocket.handshake.headers = { authorization: 'Bearer header-token' };
            mockSocket.handshake.query = { token: 'query-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: true,
                    mfa_enabled: false,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(jwtService.verifyToken).toHaveBeenCalledWith('auth-token');
        });
        it('should handle empty string token', async () => {
            mockSocket.handshake.auth = { token: '' };
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_MISSING',
                message: 'Authentication token required',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
        });
        it('should handle whitespace-only token', async () => {
            mockSocket.handshake.auth = { token: '   ' };
            vi.mocked(jwtService.verifyToken).mockRejectedValue(new Error('Invalid token'));
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.AUTHENTICATION_ERROR, {
                code: 'TOKEN_INVALID',
                message: 'Invalid or expired authentication token',
            });
            expect(mockNext).toHaveBeenCalledWith(new Error('Invalid or expired authentication token'));
        });
        it('should attach user to socket.data', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            vi.mocked(jwtService.verifyToken).mockResolvedValue({ userId: 'user-1' });
            vi.mocked(db).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue({
                    id: 'user-1',
                    email: 'test@example.com',
                    username: 'testuser',
                    email_verified: false,
                    mfa_enabled: true,
                    account_status: 'active',
                }),
            });
            await authenticateSocket(mockSocket, mockNext);
            expect(mockSocket.data).toHaveProperty('user');
            expect(mockSocket.data.user).toEqual({
                id: 'user-1',
                email: 'test@example.com',
                username: 'testuser',
                emailVerified: false,
                mfaEnabled: true,
                accountStatus: 'active',
            });
        });
    });
});
//# sourceMappingURL=auth.middleware.test.js.map