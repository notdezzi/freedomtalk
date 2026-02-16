/**
 * Reaction Integration Tests
 * Tests reaction functionality with real database and Redis
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../../config/database';
import { generateSnowflakeId } from '../../../../utils/snowflake';
import { reactionService } from '../../reaction.service';

describe('Reaction Integration Tests', () => {
  let testUserId1: string;
  let testUserId2: string;
  let testMessageId: string;
  let testChannelId: string;

  beforeAll(async () => {
    // Create test users
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

    // Create test message
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
    // Clean up test data
    await db('reactions').where('message_id', testMessageId).del();
    await db('messages').where('id', testMessageId).del();
    await db('users').whereIn('id', [testUserId1, testUserId2]).del();
  });

  describe('addReaction', () => {
    it('should add a unicode reaction to a message', async () => {
      const reaction = await reactionService.addReaction(
        testMessageId,
        testUserId1,
        'unicode',
        undefined,
        '👍'
      );

      expect(reaction).toBeDefined();
      expect(reaction.message_id).toBe(testMessageId);
      expect(reaction.user_id).toBe(testUserId1);
      expect(reaction.emoji_type).toBe('unicode');
      expect(reaction.emoji_unicode).toBe('👍');
    });

    it('should prevent duplicate reactions', async () => {
      // First reaction should succeed
      await reactionService.addReaction(
        testMessageId,
        testUserId2,
        'unicode',
        undefined,
        '❤️'
      );

      // Duplicate should fail
      await expect(
        reactionService.addReaction(testMessageId, testUserId2, 'unicode', undefined, '❤️')
      ).rejects.toThrow();
    });

    it('should allow different users to add the same reaction', async () => {
      // User 1 already has 👍, User 2 should be able to add it too
      const reaction = await reactionService.addReaction(
        testMessageId,
        testUserId2,
        'unicode',
        undefined,
        '👍'
      );

      expect(reaction).toBeDefined();
      expect(reaction.user_id).toBe(testUserId2);
    });
  });

  describe('getReactionsByMessage', () => {
    it('should get all reactions grouped by emoji', async () => {
      const reactions = await reactionService.getReactionsByMessage(testMessageId);

      expect(reactions).toBeDefined();
      expect(reactions.length).toBeGreaterThan(0);

      // Check grouping
      const thumbsUp = reactions.find((r: any) => r.emoji === '👍');
      expect(thumbsUp).toBeDefined();
      expect(thumbsUp?.count).toBe(2); // Both users reacted
    });
  });

  describe('removeReaction', () => {
    it('should remove own reaction', async () => {
      // Add a reaction to remove
      await reactionService.addReaction(
        testMessageId,
        testUserId1,
        'unicode',
        undefined,
        '😂'
      );

      // Remove it
      await reactionService.removeReaction(
        testMessageId,
        testUserId1,
        'unicode',
        undefined,
        '😂'
      );

      // Verify it's gone
      const reactions = await reactionService.getReactionsByMessage(testMessageId);
      const laugh = reactions.find((r: any) => r.emoji === '😂');
      expect(laugh).toBeUndefined();
    });
  });

  describe('removeAllReactions', () => {
    it('should remove all reactions when requested by author', async () => {
      // Create a new message for this test
      const messageId = generateSnowflakeId();
      await db('messages').insert({
        id: messageId,
        content: 'Test message for removeAll',
        author_id: testUserId1,
        channel_id: testChannelId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Add multiple reactions
      await reactionService.addReaction(messageId, testUserId1, 'unicode', undefined, '🔥');
      await reactionService.addReaction(messageId, testUserId2, 'unicode', undefined, '🎉');

      // Remove all
      await reactionService.removeAllReactions(messageId);

      // Verify all gone
      const reactions = await reactionService.getReactionsByMessage(messageId);
      expect(reactions.length).toBe(0);

      // Cleanup
      await db('messages').where('id', messageId).del();
    });
  });

  describe('getReactionUsers', () => {
    it('should get paginated list of users who reacted', async () => {
      const result = await reactionService.getReactionUsers(
        testMessageId,
        'unicode',
        undefined,
        '👍',
        10,
        0
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('Reaction limit enforcement', () => {
    it('should enforce 20 reaction limit per message', async () => {
      // Create a new message for limit testing
      const messageId = generateSnowflakeId();
      await db('messages').insert({
        id: messageId,
        content: 'Test message for limit',
        author_id: testUserId1,
        channel_id: testChannelId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Add 20 different reactions
      const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
                       '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗'];

      for (const emoji of emojis) {
        await reactionService.addReaction(messageId, testUserId1, 'unicode', undefined, emoji);
      }

      // 21st should fail
      await expect(
        reactionService.addReaction(messageId, testUserId1, 'unicode', undefined, '🤔')
      ).rejects.toThrow();

      // Cleanup
      await db('reactions').where('message_id', messageId).del();
      await db('messages').where('id', messageId).del();
    });
  });
});
