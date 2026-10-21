/**
 * Embed Integration Tests
 * Tests embed functionality with real database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../../config/database';
import { generateSnowflakeId } from '../../../../utils/snowflake';
import { embedService, EmbedData } from '../../embed.service';
import {
  createTestServerFixture,
  cleanupTestServerFixture,
  TestServerFixture,
} from '../../../../testing/fixtures';

describe('Embed Integration Tests', () => {
  let testMessageId: string;
  let fixture: TestServerFixture;

  beforeAll(async () => {
    // Create server/channel fixture so the message satisfies its FK
    fixture = await createTestServerFixture('embedtest');

    const testUserId = fixture.ownerId;

    testMessageId = generateSnowflakeId();
    await db('messages').insert({
      id: testMessageId,
      content: 'Test message for embeds',
      author_id: testUserId,
      channel_id: fixture.channelId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterAll(async () => {
    await db('message_embeds').where('message_id', testMessageId).del();
    await db('messages').where('id', testMessageId).del();
    await cleanupTestServerFixture(fixture);
  });

  describe('createEmbed', () => {
    it('should create a rich embed', async () => {
      const embedData: EmbedData = {
        type: 'rich',
        title: 'Test Embed',
        description: 'This is a test embed description',
        color: 0x5865F2,
      };

      const embed = await embedService.createEmbed(testMessageId, embedData);

      expect(embed).toBeDefined();
      expect(embed.title).toBe('Test Embed');
      expect(embed.description).toBe('This is a test embed description');
      expect(embed.color).toBe(0x5865F2);
    });

    it('should create an embed with fields', async () => {
      const embedData: EmbedData = {
        type: 'rich',
        title: 'Embed with Fields',
        fields: [
          { name: 'Field 1', value: 'Value 1', inline: true },
          { name: 'Field 2', value: 'Value 2', inline: false },
        ],
      };

      const embed = await embedService.createEmbed(testMessageId, embedData);

      expect(embed.fields).toBeDefined();
      expect(embed.fields).toHaveLength(2);
    });

    it('should create an embed with footer and author', async () => {
      const embedData: EmbedData = {
        type: 'rich',
        title: 'Complete Embed',
        footer_text: 'Footer text',
        footer_icon_url: 'https://example.com/footer.png',
        author_name: 'Author Name',
        author_url: 'https://example.com',
      };

      const embed = await embedService.createEmbed(testMessageId, embedData);

      expect(embed.footer_text).toBe('Footer text');
      expect(embed.author_name).toBe('Author Name');
    });
  });

  describe('createEmbeds', () => {
    it('should create multiple embeds in a transaction', async () => {
      const messageId = generateSnowflakeId();
      const message = await db('messages').where('id', testMessageId).first();

      await db('messages').insert({
        id: messageId,
        content: 'Multi-embed test',
        author_id: message.author_id,
        channel_id: message.channel_id,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const embeds: EmbedData[] = [
        { type: 'rich', title: 'Embed 1' },
        { type: 'rich', title: 'Embed 2' },
        { type: 'rich', title: 'Embed 3' },
      ];

      const created = await embedService.createEmbeds(messageId, embeds);

      expect(created).toHaveLength(3);

      // Cleanup
      await db('message_embeds').where('message_id', messageId).del();
      await db('messages').where('id', messageId).del();
    });

    it('should reject more than 10 embeds', async () => {
      const embeds: EmbedData[] = Array(11).fill(null).map((_, i) => ({
        type: 'rich' as const,
        title: `Embed ${i}`,
      }));

      await expect(
        embedService.createEmbeds(testMessageId, embeds)
      ).rejects.toThrow();
    });
  });

  describe('getEmbedsByMessage', () => {
    it('should retrieve all embeds for a message', async () => {
      const embeds = await embedService.getEmbedsByMessage(testMessageId);

      expect(embeds).toBeDefined();
      expect(embeds.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should enforce title length limit (256 chars)', async () => {
      const embedData: EmbedData = {
        type: 'rich',
        title: 'a'.repeat(257),
      };

      await expect(
        embedService.createEmbed(testMessageId, embedData)
      ).rejects.toThrow();
    });

    it('should enforce description length limit (4096 chars)', async () => {
      const embedData: EmbedData = {
        type: 'rich',
        description: 'a'.repeat(4097),
      };

      await expect(
        embedService.createEmbed(testMessageId, embedData)
      ).rejects.toThrow();
    });

    it('should enforce max 25 fields', async () => {
      const embedData: EmbedData = {
        type: 'rich',
        fields: Array(26).fill(null).map((_, i) => ({
          name: `Field ${i}`,
          value: `Value ${i}`,
        })),
      };

      await expect(
        embedService.createEmbed(testMessageId, embedData)
      ).rejects.toThrow();
    });
  });

  describe('Cascade delete', () => {
    it('should delete embeds when message is deleted', async () => {
      // Create a new message with embed
      const messageId = generateSnowflakeId();
      const message = await db('messages').where('id', testMessageId).first();

      await db('messages').insert({
        id: messageId,
        content: 'Cascade delete test',
        author_id: message.author_id,
        channel_id: message.channel_id,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await embedService.createEmbed(messageId, { type: 'rich', title: 'To be deleted' });

      // Delete the message
      await db('messages').where('id', messageId).del();

      // Check embeds are gone
      const embeds = await embedService.getEmbedsByMessage(messageId);
      expect(embeds.length).toBe(0);
    });
  });
});
