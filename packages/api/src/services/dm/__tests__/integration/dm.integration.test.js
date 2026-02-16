import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../../../config/database';
import { generateSnowflakeId } from '../../../../utils/snowflake';
import { dmChannelService } from '../../dm-channel.service';
describe('DM Channel Integration Tests', () => {
    let testUserId1;
    let testUserId2;
    let testUserId3;
    beforeAll(async () => {
        testUserId1 = generateSnowflakeId();
        testUserId2 = generateSnowflakeId();
        testUserId3 = generateSnowflakeId();
        await db('users').insert([
            {
                id: testUserId1,
                email: 'dmtest1@example.com',
                username: 'dmtestuser1',
                password_hash: 'hash',
                display_name: 'DM Test User 1',
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                id: testUserId2,
                email: 'dmtest2@example.com',
                username: 'dmtestuser2',
                password_hash: 'hash',
                display_name: 'DM Test User 2',
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                id: testUserId3,
                email: 'dmtest3@example.com',
                username: 'dmtestuser3',
                password_hash: 'hash',
                display_name: 'DM Test User 3',
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
    });
    afterAll(async () => {
        const dmChannels = await db('dm_channels')
            .whereIn('owner_id', [testUserId1, testUserId2, testUserId3])
            .orWhereRaw('id IN (SELECT dm_channel_id FROM dm_channel_participants WHERE user_id IN (?, ?, ?))', [testUserId1, testUserId2, testUserId3]);
        for (const channel of dmChannels) {
            await db('dm_channel_participants').where('dm_channel_id', channel.id).del();
        }
        await db('dm_channels')
            .whereIn('owner_id', [testUserId1, testUserId2, testUserId3])
            .del();
        await db('users').whereIn('id', [testUserId1, testUserId2, testUserId3]).del();
    });
    describe('createDM', () => {
        it('should create a DM between two users', async () => {
            const dmChannel = await dmChannelService.createDM(testUserId1, testUserId2);
            expect(dmChannel).toBeDefined();
            expect(dmChannel.type).toBe('dm');
            expect(dmChannel.name).toBeNull();
            expect(dmChannel.participants.length).toBe(2);
            const participantIds = dmChannel.participants.map((p) => p.user_id);
            expect(participantIds).toContain(testUserId1);
            expect(participantIds).toContain(testUserId2);
        });
        it('should return existing DM if one already exists', async () => {
            const dm1 = await dmChannelService.createDM(testUserId1, testUserId2);
            const dm2 = await dmChannelService.createDM(testUserId2, testUserId1);
            expect(dm1.id).toBe(dm2.id);
        });
    });
    describe('createGroupDM', () => {
        it('should create a group DM with multiple participants', async () => {
            const groupDM = await dmChannelService.createGroupDM(testUserId1, [testUserId2, testUserId3], 'Test Group', undefined);
            expect(groupDM).toBeDefined();
            expect(groupDM.type).toBe('group_dm');
            expect(groupDM.name).toBe('Test Group');
            expect(groupDM.owner_id).toBe(testUserId1);
            expect(groupDM.participants.length).toBe(3);
        });
        it('should reject group DM with less than 2 participants', async () => {
            await expect(dmChannelService.createGroupDM(testUserId1, [], 'Invalid Group')).rejects.toThrow();
        });
    });
    describe('getDMByParticipants', () => {
        it('should find existing DM between users', async () => {
            const dmChannel = await dmChannelService.getDMByParticipants(testUserId1, testUserId2);
            expect(dmChannel).toBeDefined();
            expect(dmChannel?.type).toBe('dm');
        });
        it('should return null for non-existent DM', async () => {
            const newUserId = generateSnowflakeId();
            await db('users').insert({
                id: newUserId,
                email: 'newuser@example.com',
                username: 'newuser',
                password_hash: 'hash',
                created_at: new Date(),
                updated_at: new Date(),
            });
            const dmChannel = await dmChannelService.getDMByParticipants(testUserId1, newUserId);
            expect(dmChannel).toBeNull();
            await db('users').where('id', newUserId).del();
        });
    });
    describe('getDMsByUser', () => {
        it('should get all DMs for a user', async () => {
            const result = await dmChannelService.getDMsByUser(testUserId1, 50, 0);
            expect(result).toBeDefined();
            expect(result.dmChannels.length).toBeGreaterThan(0);
            expect(result.total).toBeGreaterThan(0);
            for (const dm of result.dmChannels) {
                const isParticipant = dm.participants.some((p) => p.user_id === testUserId1);
                expect(isParticipant).toBe(true);
            }
        });
    });
    describe('addParticipant', () => {
        let groupDMId;
        beforeEach(async () => {
            const groupDM = await dmChannelService.createGroupDM(testUserId1, [testUserId2], 'Add Participant Test');
            groupDMId = groupDM.id;
        });
        it('should add a participant to a group DM', async () => {
            const newUserId = generateSnowflakeId();
            await db('users').insert({
                id: newUserId,
                email: 'newparticipant@example.com',
                username: 'newparticipant',
                password_hash: 'hash',
                created_at: new Date(),
                updated_at: new Date(),
            });
            const updated = await dmChannelService.addParticipant(groupDMId, newUserId, testUserId1);
            expect(updated.participants.length).toBe(3);
            expect(updated.participants.some((p) => p.user_id === newUserId)).toBe(true);
            await db('users').where('id', newUserId).del();
        });
        it('should reject adding to non-group DM', async () => {
            const dm = await dmChannelService.createDM(testUserId1, testUserId3);
            await expect(dmChannelService.addParticipant(dm.id, testUserId2, testUserId1)).rejects.toThrow();
        });
    });
    describe('removeParticipant', () => {
        let groupDMId;
        beforeEach(async () => {
            const groupDM = await dmChannelService.createGroupDM(testUserId1, [testUserId2, testUserId3], 'Remove Participant Test');
            groupDMId = groupDM.id;
        });
        it('should allow user to remove themselves', async () => {
            const updated = await dmChannelService.removeParticipant(groupDMId, testUserId3, testUserId3);
            const activeParticipants = updated.participants.filter((p) => p.is_active);
            expect(activeParticipants.length).toBe(2);
        });
        it('should allow owner to remove other participants', async () => {
            const updated = await dmChannelService.removeParticipant(groupDMId, testUserId2, testUserId1);
            const activeParticipants = updated.participants.filter((p) => p.is_active);
            expect(activeParticipants.length).toBe(2);
        });
    });
    describe('updateGroupDM', () => {
        it('should update group DM name', async () => {
            const groupDM = await dmChannelService.createGroupDM(testUserId1, [testUserId2], 'Original Name');
            const updated = await dmChannelService.updateGroupDM(groupDM.id, { name: 'Updated Name' }, testUserId1);
            expect(updated.name).toBe('Updated Name');
        });
        it('should reject update from non-owner', async () => {
            const groupDM = await dmChannelService.createGroupDM(testUserId1, [testUserId2], 'Owner Test');
            await expect(dmChannelService.updateGroupDM(groupDM.id, { name: 'Hacked Name' }, testUserId2)).rejects.toThrow();
        });
    });
    describe('deleteDM', () => {
        it('should soft delete DM for user', async () => {
            const dm = await dmChannelService.createDM(testUserId1, testUserId2);
            await dmChannelService.deleteDM(dm.id, testUserId1);
            const isParticipant = await dmChannelService.isParticipant(dm.id, testUserId1);
            expect(isParticipant).toBe(false);
            const otherIsParticipant = await dmChannelService.isParticipant(dm.id, testUserId2);
            expect(otherIsParticipant).toBe(true);
        });
    });
    describe('isParticipant', () => {
        it('should return true for active participant', async () => {
            const dm = await dmChannelService.createDM(testUserId1, testUserId2);
            const isParticipant = await dmChannelService.isParticipant(dm.id, testUserId1);
            expect(isParticipant).toBe(true);
        });
        it('should return false for non-participant', async () => {
            const dm = await dmChannelService.createDM(testUserId1, testUserId2);
            const isParticipant = await dmChannelService.isParticipant(dm.id, testUserId3);
            expect(isParticipant).toBe(false);
        });
    });
    describe('Privacy', () => {
        it('should not allow non-participants to access DM', async () => {
            const dm = await dmChannelService.createDM(testUserId1, testUserId2);
            const dmChannel = await dmChannelService.getDMById(dm.id);
            expect(dmChannel.participants.every((p) => p.user_id !== testUserId3)).toBe(true);
        });
    });
});
//# sourceMappingURL=dm.integration.test.js.map