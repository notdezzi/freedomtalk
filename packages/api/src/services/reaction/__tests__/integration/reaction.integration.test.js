import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../../config/database';
import { generateSnowflakeId } from '../../../../utils/snowflake';
import { reactionService } from '../../reaction.service';
describe('Reaction Integration Tests', () => {
    let testUserId1;
    let testUserId2;
    let testMessageId;
    let testChannelId;
    beforeAll(async () => {
        testUserId1 = generateSnowflakeId();
        testUserId2 = generateSnowflakeId();
        testChannelId = generateSnowflakeId();
        testMessageId = generateSnowflakeId();
        await db('users').insert([
            {
                id: testUserId1,
                email: 'test1@example.com',
                username: 'testuser1',
                password_hash: 'hash',
                display_name: 'Test User 1',
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                id: testUserId2,
                email: 'test2@example.com',
                username: 'testuser2',
                password_hash: 'hash',
                display_name: 'Test User 2',
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
        await db('messages').insert({
            id: testMessageId,
            content: 'Test message for reactions',
            author_id: testUserId1,
            channel_id: testChannelId,
            created_at: new Date(),
            updated_at: new Date(),
        });
    });
    afterAll(async () => {
        await db('reactions').where('message_id', testMessageId).del();
        await db('messages').where('id', testMessageId).del();
        await db('users').whereIn('id', [testUserId1, testUserId2]).del();
    });
    describe('addReaction', () => {
        it('should add a unicode reaction to a message', async () => {
            const reaction = await reactionService.addReaction(testMessageId, testUserId1, 'unicode', undefined, '👍');
            expect(reaction).toBeDefined();
            expect(reaction.message_id).toBe(testMessageId);
            expect(reaction.user_id).toBe(testUserId1);
            expect(reaction.emoji_type).toBe('unicode');
            expect(reaction.emoji_unicode).toBe('👍');
        });
        it('should prevent duplicate reactions', async () => {
            await reactionService.addReaction(testMessageId, testUserId2, 'unicode', undefined, '❤️');
            await expect(reactionService.addReaction(testMessageId, testUserId2, 'unicode', undefined, '❤️')).rejects.toThrow();
        });
        it('should allow different users to add the same reaction', async () => {
            const reaction = await reactionService.addReaction(testMessageId, testUserId2, 'unicode', undefined, '👍');
            expect(reaction).toBeDefined();
            expect(reaction.user_id).toBe(testUserId2);
        });
    });
    describe('getReactionsByMessage', () => {
        it('should get all reactions grouped by emoji', async () => {
            const reactions = await reactionService.getReactionsByMessage(testMessageId);
            expect(reactions).toBeDefined();
            expect(reactions.length).toBeGreaterThan(0);
            const thumbsUp = reactions.find((r) => r.emoji === '👍');
            expect(thumbsUp).toBeDefined();
            expect(thumbsUp?.count).toBe(2);
        });
    });
    describe('removeReaction', () => {
        it('should remove own reaction', async () => {
            await reactionService.addReaction(testMessageId, testUserId1, 'unicode', undefined, '😂');
            await reactionService.removeReaction(testMessageId, testUserId1, 'unicode', undefined, '😂');
            const reactions = await reactionService.getReactionsByMessage(testMessageId);
            const laugh = reactions.find((r) => r.emoji === '😂');
            expect(laugh).toBeUndefined();
        });
    });
    describe('removeAllReactions', () => {
        it('should remove all reactions when requested by author', async () => {
            const messageId = generateSnowflakeId();
            await db('messages').insert({
                id: messageId,
                content: 'Test message for removeAll',
                author_id: testUserId1,
                channel_id: testChannelId,
                created_at: new Date(),
                updated_at: new Date(),
            });
            await reactionService.addReaction(messageId, testUserId1, 'unicode', undefined, '🔥');
            await reactionService.addReaction(messageId, testUserId2, 'unicode', undefined, '🎉');
            await reactionService.removeAllReactions(messageId);
            const reactions = await reactionService.getReactionsByMessage(messageId);
            expect(reactions.length).toBe(0);
            await db('messages').where('id', messageId).del();
        });
    });
    describe('getReactionUsers', () => {
        it('should get paginated list of users who reacted', async () => {
            const result = await reactionService.getReactionUsers(testMessageId, 'unicode', undefined, '👍', 10, 0);
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(2);
        });
    });
    describe('Reaction limit enforcement', () => {
        it('should enforce 20 reaction limit per message', async () => {
            const messageId = generateSnowflakeId();
            await db('messages').insert({
                id: messageId,
                content: 'Test message for limit',
                author_id: testUserId1,
                channel_id: testChannelId,
                created_at: new Date(),
                updated_at: new Date(),
            });
            const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
                '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗'];
            for (const emoji of emojis) {
                await reactionService.addReaction(messageId, testUserId1, 'unicode', undefined, emoji);
            }
            await expect(reactionService.addReaction(messageId, testUserId1, 'unicode', undefined, '🤔')).rejects.toThrow();
            await db('reactions').where('message_id', messageId).del();
            await db('messages').where('id', messageId).del();
        });
    });
});
//# sourceMappingURL=reaction.integration.test.js.map