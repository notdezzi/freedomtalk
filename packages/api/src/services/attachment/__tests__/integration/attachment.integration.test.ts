/**
 * Attachment Integration Tests
 * Tests attachment functionality (validation and metadata - MinIO mocking for unit tests)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../../config/database';
import { generateSnowflakeId } from '../../../../utils/snowflake';
import { VALIDATION } from '@freedomtalk/shared';

describe('Attachment Integration Tests', () => {
  let testMessageId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    testUserId = generateSnowflakeId();
    await db('users').insert({
      id: testUserId,
      email: 'attachmenttest@example.com',
      username: 'attachmenttestuser',
      password_hash: 'hash',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create test message
    testMessageId = generateSnowflakeId();
    await db('messages').insert({
      id: testMessageId,
      content: 'Test message for attachments',
      author_id: testUserId,
      channel_id: generateSnowflakeId(),
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterAll(async () => {
    await db('message_attachments').where('message_id', testMessageId).del();
    await db('messages').where('id', testMessageId).del();
    await db('users').where('id', testUserId).del();
  });

  describe('File Validation Constants', () => {
    it('should have correct max file size (25MB)', () => {
      expect(VALIDATION.ATTACHMENT.MAX_FILE_SIZE).toBe(26214400); // 25MB in bytes
    });

    it('should have correct max attachments per message (10)', () => {
      expect(VALIDATION.ATTACHMENT.MAX_PER_MESSAGE).toBe(10);
    });

    it('should have allowed image types', () => {
      expect(VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES).toContain('image/gif');
      expect(VALIDATION.ATTACHMENT.ALLOWED_IMAGE_TYPES).toContain('image/webp');
    });

    it('should have allowed video types', () => {
      expect(VALIDATION.ATTACHMENT.ALLOWED_VIDEO_TYPES).toContain('video/mp4');
      expect(VALIDATION.ATTACHMENT.ALLOWED_VIDEO_TYPES).toContain('video/webm');
    });

    it('should have allowed audio types', () => {
      expect(VALIDATION.ATTACHMENT.ALLOWED_AUDIO_TYPES).toContain('audio/mpeg');
      expect(VALIDATION.ATTACHMENT.ALLOWED_AUDIO_TYPES).toContain('audio/ogg');
      expect(VALIDATION.ATTACHMENT.ALLOWED_AUDIO_TYPES).toContain('audio/wav');
    });

    it('should have allowed document types', () => {
      expect(VALIDATION.ATTACHMENT.ALLOWED_DOCUMENT_TYPES).toContain('application/pdf');
      expect(VALIDATION.ATTACHMENT.ALLOWED_DOCUMENT_TYPES).toContain('text/plain');
    });
  });

  describe('Attachment Database Operations', () => {
    it('should insert attachment metadata', async () => {
      const attachmentId = generateSnowflakeId();

      await db('message_attachments').insert({
        id: attachmentId,
        message_id: testMessageId,
        filename: 'test-image.png',
        size: 1024,
        mime_type: 'image/png',
        object_path: 'attachments/test-image.png',
        uploaded_by: testUserId,
        created_at: new Date(),
      });

      const attachment = await db('message_attachments')
        .where('id', attachmentId)
        .first();

      expect(attachment).toBeDefined();
      expect(attachment.filename).toBe('test-image.png');
      expect(attachment.mime_type).toBe('image/png');
      expect(attachment.size).toBe(1024);
    });

    it('should store image dimensions', async () => {
      const attachmentId = generateSnowflakeId();

      await db('message_attachments').insert({
        id: attachmentId,
        message_id: testMessageId,
        filename: 'test-image-2.png',
        size: 2048,
        mime_type: 'image/png',
        object_path: 'attachments/test-image-2.png',
        width: 1920,
        height: 1080,
        uploaded_by: testUserId,
        created_at: new Date(),
      });

      const attachment = await db('message_attachments')
        .where('id', attachmentId)
        .first();

      expect(attachment.width).toBe(1920);
      expect(attachment.height).toBe(1080);
    });

    it('should store thumbnail path', async () => {
      const attachmentId = generateSnowflakeId();

      await db('message_attachments').insert({
        id: attachmentId,
        message_id: testMessageId,
        filename: 'test-image-3.png',
        size: 4096,
        mime_type: 'image/png',
        object_path: 'attachments/test-image-3.png',
        thumbnail_path: 'thumbnails/test-image-3.png',
        uploaded_by: testUserId,
        created_at: new Date(),
      });

      const attachment = await db('message_attachments')
        .where('id', attachmentId)
        .first();

      expect(attachment.thumbnail_path).toBe('thumbnails/test-image-3.png');
    });

    it('should query attachments by message', async () => {
      const attachments = await db('message_attachments')
        .where('message_id', testMessageId);

      expect(attachments.length).toBeGreaterThan(0);
    });

    it('should delete attachments with message cascade', async () => {
      // Create a new message with attachment
      const messageId = generateSnowflakeId();
      const attachmentId = generateSnowflakeId();

      await db('messages').insert({
        id: messageId,
        content: 'To be deleted',
        author_id: testUserId,
        channel_id: generateSnowflakeId(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db('message_attachments').insert({
        id: attachmentId,
        message_id: messageId,
        filename: 'delete-test.png',
        size: 512,
        mime_type: 'image/png',
        object_path: 'attachments/delete-test.png',
        uploaded_by: testUserId,
        created_at: new Date(),
      });

      // Delete message
      await db('messages').where('id', messageId).del();

      // Check attachment is gone
      const attachment = await db('message_attachments')
        .where('id', attachmentId)
        .first();

      expect(attachment).toBeUndefined();
    });
  });

  describe('Attachment Size Constraints', () => {
    it('should enforce positive file size', async () => {
      const attachmentId = generateSnowflakeId();

      // This should fail due to check constraint
      await expect(
        db('message_attachments').insert({
          id: attachmentId,
          message_id: testMessageId,
          filename: 'invalid-size.png',
          size: -1,
          mime_type: 'image/png',
          object_path: 'attachments/invalid.png',
          uploaded_by: testUserId,
          created_at: new Date(),
        })
      ).rejects.toThrow();
    });

    it('should enforce positive dimensions', async () => {
      const attachmentId = generateSnowflakeId();

      // This should fail due to check constraint
      await expect(
        db('message_attachments').insert({
          id: attachmentId,
          message_id: testMessageId,
          filename: 'invalid-dims.png',
          size: 100,
          mime_type: 'image/png',
          object_path: 'attachments/invalid-dims.png',
          width: -100,
          uploaded_by: testUserId,
          created_at: new Date(),
        })
      ).rejects.toThrow();
    });
  });
});
