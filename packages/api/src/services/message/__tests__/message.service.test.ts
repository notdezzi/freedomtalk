/**
 * Message Service Tests
 *
 * Comprehensive tests for message CRUD operations, pagination, filtering, and history tracking.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { messageService } from '../message.service';
import { db } from '../../../config/database';
import { generateSnowflakeId } from '../../../utils/snowflake';
import { NotFoundError, ConflictError } from '../../../types/api.types';

describe('MessageService', () => {
  let testUserId: string;
  let testUserId2: string;

  beforeAll(async () => {
    // Create test users
    testUserId = generateSnowflakeId();
    testUserId2 = generateSnowflakeId();

    await db('users').insert([
      {
        id: testUserId,
        username: 'testuser1',
        email: 'test1@example.com',
        password_hash: 'hash',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: testUserId2,
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hash',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db('messages').where({ author_id: testUserId }).orWhere({ author_id: testUserId2 }).del();
    await db('users').whereIn('id', [testUserId, testUserId2]).del();
  });

  afterEach(async () => {
    // Clean up messages after each test
    await db('messages').where({ author_id: testUserId }).orWhere({ author_id: testUserId2 }).del();
  });

  describe('createMessage', () => {
    it('should create a message successfully', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.content).toBe('Test message');
      expect(message.author_id).toBe(testUserId);
      expect(message.channel_id).toBeNull();
      expect(message.is_edited).toBe(false);
      expect(message.is_deleted).toBe(false);
      expect(message.is_pinned).toBe(false);
    });

    it('should create a message with channel ID', async () => {
      const channelId = generateSnowflakeId();
      const message = await messageService.createMessage({
        content: 'Channel message',
        authorId: testUserId,
        channelId,
      });

      expect(message.channel_id).toBe(channelId);
    });

    it('should throw NotFoundError for non-existent author', async () => {
      await expect(
        messageService.createMessage({
          content: 'Test message',
          authorId: 'nonexistent',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getMessage', () => {
    it('should retrieve a message by ID', async () => {
      const created = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      const retrieved = await messageService.getMessage(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.content).toBe('Test message');
    });

    it('should throw NotFoundError for non-existent message', async () => {
      await expect(messageService.getMessage('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should not retrieve soft-deleted messages by default', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      await messageService.softDeleteMessage(message.id, testUserId);

      await expect(messageService.getMessage(message.id)).rejects.toThrow(NotFoundError);
    });

    it('should retrieve soft-deleted messages when includeDeleted is true', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      await messageService.softDeleteMessage(message.id, testUserId);

      const retrieved = await messageService.getMessage(message.id, true);
      expect(retrieved).toBeDefined();
      expect(retrieved.is_deleted).toBe(true);
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      // Create multiple test messages
      for (let i = 0; i < 5; i++) {
        await messageService.createMessage({
          content: `Test message ${i}`,
          authorId: testUserId,
        });
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    it('should retrieve messages with default pagination', async () => {
      const result = await messageService.getMessages();

      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages.length).toBeLessThanOrEqual(50);
    });

    it('should respect limit parameter', async () => {
      const result = await messageService.getMessages({ limit: 3 });

      expect(result.messages.length).toBeLessThanOrEqual(3);
    });

    it('should filter by author ID', async () => {
      await messageService.createMessage({
        content: 'Message from user 2',
        authorId: testUserId2,
      });

      const result = await messageService.getMessages({}, { authorId: testUserId });

      expect(result.messages.every((m) => m.author_id === testUserId)).toBe(true);
    });

    it('should filter by search term', async () => {
      await messageService.createMessage({
        content: 'Unique search term here',
        authorId: testUserId,
      });

      const result = await messageService.getMessages({}, { search: 'Unique search term' });

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages.some((m) => m.content.includes('Unique search term'))).toBe(true);
    });

    it('should filter by pinned status', async () => {
      const message = await messageService.createMessage({
        content: 'Pinned message',
        authorId: testUserId,
      });

      await messageService.pinMessage(message.id);

      const result = await messageService.getMessages({}, { isPinned: true });

      expect(result.messages.every((m) => m.is_pinned === true)).toBe(true);
    });
  });

  describe('updateMessage', () => {
    it('should update message content', async () => {
      const message = await messageService.createMessage({
        content: 'Original content',
        authorId: testUserId,
      });

      const updated = await messageService.updateMessage(message.id, 'Updated content', testUserId);

      expect(updated.content).toBe('Updated content');
      expect(updated.is_edited).toBe(true);
      expect(updated.edited_at).toBeDefined();
    });

    it('should create history record on update', async () => {
      const message = await messageService.createMessage({
        content: 'Original content',
        authorId: testUserId,
      });

      await messageService.updateMessage(message.id, 'Updated content', testUserId);

      const history = await messageService.getMessageHistory(message.id);

      expect(history.length).toBe(1);
      expect(history[0]?.content).toBe('Original content');
      expect(history[0]?.edited_by).toBe(testUserId);
    });

    it('should throw NotFoundError for non-existent message', async () => {
      await expect(messageService.updateMessage('nonexistent', 'New content', testUserId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ConflictError for deleted message', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      await messageService.softDeleteMessage(message.id, testUserId);

      await expect(messageService.updateMessage(message.id, 'New content', testUserId)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('softDeleteMessage', () => {
    it('should soft delete a message', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      await messageService.softDeleteMessage(message.id, testUserId);

      const deleted = await messageService.getMessage(message.id, true);

      expect(deleted.is_deleted).toBe(true);
      expect(deleted.deleted_at).toBeDefined();
    });

    it('should throw ConflictError when deleting already deleted message', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      await messageService.softDeleteMessage(message.id, testUserId);

      await expect(messageService.softDeleteMessage(message.id, testUserId)).rejects.toThrow(ConflictError);
    });
  });

  describe('hardDeleteMessage', () => {
    it('should permanently delete a message', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      await messageService.hardDeleteMessage(message.id);

      await expect(messageService.getMessage(message.id, true)).rejects.toThrow(NotFoundError);
    });

    it('should delete message history on hard delete', async () => {
      const message = await messageService.createMessage({
        content: 'Original content',
        authorId: testUserId,
      });

      await messageService.updateMessage(message.id, 'Updated content', testUserId);

      await messageService.hardDeleteMessage(message.id);

      const history = await db('message_history').where({ message_id: message.id });
      expect(history.length).toBe(0);
    });
  });

  describe('pinMessage and unpinMessage', () => {
    it('should pin a message', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      const pinned = await messageService.pinMessage(message.id);

      expect(pinned.is_pinned).toBe(true);
    });

    it('should unpin a message', async () => {
      const message = await messageService.createMessage({
        content: 'Test message',
        authorId: testUserId,
      });

      await messageService.pinMessage(message.id);
      const unpinned = await messageService.unpinMessage(message.id);

      expect(unpinned.is_pinned).toBe(false);
    });
  });
});

