import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../../config/database';
import { generateSnowflakeId } from '../../../../utils/snowflake';
import { embedService } from '../../embed.service';
describe('Embed Integration Tests', () => {
    let testMessageId;
    beforeAll(async () => {
        testMessageId = generateSnowflakeId();
        const testUserId = generateSnowflakeId();
        await db('users').insert({
            id: testUserId,
            email: 'embedtest@example.com',
            username: 'embedtestuser',
            password_hash: 'hash',
            created_at: new Date(),
            updated_at: new Date(),
        });
        await db('messages').insert({
            id: testMessageId,
            content: 'Test message for embeds',
            author_id: testUserId,
            channel_id: generateSnowflakeId(),
            created_at: new Date(),
            updated_at: new Date(),
        });
    });
    afterAll(async () => {
        await db('message_embeds').where('message_id', testMessageId).del();
        const message = await db('messages').where('id', testMessageId).first();
        if (message) {
            await db('messages').where('id', testMessageId).del();
            await db('users').where('id', message.author_id).del();
        }
    });
    describe('createEmbed', () => {
        it('should create a rich embed', async () => {
            const embedData = {
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
            const embedData = {
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
            const embedData = {
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
            const embeds = [
                { type: 'rich', title: 'Embed 1' },
                { type: 'rich', title: 'Embed 2' },
                { type: 'rich', title: 'Embed 3' },
            ];
            const created = await embedService.createEmbeds(messageId, embeds);
            expect(created).toHaveLength(3);
            await db('message_embeds').where('message_id', messageId).del();
            await db('messages').where('id', messageId).del();
        });
        it('should reject more than 10 embeds', async () => {
            const embeds = Array(11).fill(null).map((_, i) => ({
                type: 'rich',
                title: `Embed ${i}`,
            }));
            await expect(embedService.createEmbeds(testMessageId, embeds)).rejects.toThrow();
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
            const embedData = {
                type: 'rich',
                title: 'a'.repeat(257),
            };
            await expect(embedService.createEmbed(testMessageId, embedData)).rejects.toThrow();
        });
        it('should enforce description length limit (4096 chars)', async () => {
            const embedData = {
                type: 'rich',
                description: 'a'.repeat(4097),
            };
            await expect(embedService.createEmbed(testMessageId, embedData)).rejects.toThrow();
        });
        it('should enforce max 25 fields', async () => {
            const embedData = {
                type: 'rich',
                fields: Array(26).fill(null).map((_, i) => ({
                    name: `Field ${i}`,
                    value: `Value ${i}`,
                })),
            };
            await expect(embedService.createEmbed(testMessageId, embedData)).rejects.toThrow();
        });
    });
    describe('Cascade delete', () => {
        it('should delete embeds when message is deleted', async () => {
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
            await db('messages').where('id', messageId).del();
            const embeds = await embedService.getEmbedsByMessage(messageId);
            expect(embeds.length).toBe(0);
        });
    });
});
//# sourceMappingURL=embed.integration.test.js.map