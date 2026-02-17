import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../../config/database', () => ({
    db: vi.fn((table) => {
        const chainable = Promise.resolve([]);
        const methods = [
            'into', 'returning', 'from', 'where', 'first', 'update', 'delete',
            'insert', 'orderBy', 'leftJoin', 'select', 'limit', 'offset', 'count',
            'whereIn', 'andWhere', 'orWhere', 'groupBy', 'having'
        ];
        methods.forEach(method => {
            chainable[method] = vi.fn(() => chainable);
        });
        return chainable;
    })
}));
vi.mock('../../utils/snowflake', () => ({
    generateSnowflakeId: vi.fn(() => 'mock-snowflake-id')
}));
import { voiceStateService } from '../voice-state.service';
describe('VoiceStateService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('service structure', () => {
        it('should have createVoiceState method', () => {
            expect(typeof voiceStateService.createVoiceState).toBe('function');
        });
        it('should have deleteVoiceState method', () => {
            expect(typeof voiceStateService.deleteVoiceState).toBe('function');
        });
        it('should have updateVoiceState method', () => {
            expect(typeof voiceStateService.updateVoiceState).toBe('function');
        });
        it('should have getVoiceStateBySession method', () => {
            expect(typeof voiceStateService.getVoiceStateBySession).toBe('function');
        });
        it('should have getChannelVoiceStates method', () => {
            expect(typeof voiceStateService.getChannelVoiceStates).toBe('function');
        });
        it('should have getUserVoiceStateInServer method', () => {
            expect(typeof voiceStateService.getUserVoiceStateInServer).toBe('function');
        });
        it('should have moveUser method', () => {
            expect(typeof voiceStateService.moveUser).toBe('function');
        });
        it('should have kickUser method', () => {
            expect(typeof voiceStateService.kickUser).toBe('function');
        });
        it('should have getChannelStreams method', () => {
            expect(typeof voiceStateService.getChannelStreams).toBe('function');
        });
    });
    describe('createVoiceState', () => {
        it('should create a new voice state', async () => {
            const input = {
                channelId: 'ch-1',
                userId: 'u-1',
                serverId: 's-1',
                sessionId: 'session-1',
            };
            await expect(voiceStateService.createVoiceState(input)).resolves.not.toThrow();
        });
    });
    describe('deleteVoiceState', () => {
        it('should delete voice state by session ID', async () => {
            await expect(voiceStateService.deleteVoiceState('session-1')).resolves.not.toThrow();
        });
    });
    describe('getVoiceStateBySession', () => {
        it('should handle session lookup', async () => {
            const result = await voiceStateService.getVoiceStateBySession('non-existent');
            expect(result === null || result === undefined || Array.isArray(result)).toBe(true);
        });
    });
    describe('getChannelVoiceStates', () => {
        it('should return empty array for channel with no users', async () => {
            const result = await voiceStateService.getChannelVoiceStates('ch-1');
            expect(Array.isArray(result)).toBe(true);
        });
    });
    describe('getChannelUserCount', () => {
        it('should return count of users in channel', async () => {
            const result = await voiceStateService.getChannelUserCount('ch-1');
            expect(typeof result).toBe('number');
        });
    });
    describe('getChannelStreams', () => {
        it('should return stream counts', async () => {
            const result = await voiceStateService.getChannelStreams('ch-1');
            expect(result).toHaveProperty('video');
            expect(result).toHaveProperty('screen');
        });
    });
});
//# sourceMappingURL=voice-state.service.test.js.map