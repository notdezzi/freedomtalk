import { describe, it, expect } from 'vitest';
import { generateMessagePreview, sanitizeMessageContent } from '../message.utils';
describe('Message Utils', () => {
    describe('generateMessagePreview', () => {
        it('should return empty string for empty content', () => {
            expect(generateMessagePreview('')).toBe('');
            expect(generateMessagePreview('   ')).toBe('');
        });
        it('should return content as-is if shorter than max length', () => {
            const content = 'Short message';
            expect(generateMessagePreview(content, 100)).toBe(content);
        });
        it('should truncate long content with ellipsis', () => {
            const content = 'This is a very long message that should be truncated to fit within the maximum length';
            const preview = generateMessagePreview(content, 20);
            expect(preview.length).toBeLessThanOrEqual(23);
            expect(preview.endsWith('...')).toBe(true);
        });
        it('should strip bold markdown (**text**)', () => {
            const content = '**Bold text** and normal text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Bold text and normal text');
        });
        it('should strip bold markdown (__text__)', () => {
            const content = '__Bold text__ and normal text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Bold text and normal text');
        });
        it('should strip italic markdown (*text*)', () => {
            const content = '*Italic text* and normal text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Italic text and normal text');
        });
        it('should strip italic markdown (_text_)', () => {
            const content = '_Italic text_ and normal text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Italic text and normal text');
        });
        it('should strip strikethrough markdown (~~text~~)', () => {
            const content = '~~Strikethrough text~~ and normal text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Strikethrough text and normal text');
        });
        it('should strip inline code (`code`)', () => {
            const content = 'Some `code here` in text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Some code here in text');
        });
        it('should replace code blocks with [code]', () => {
            const content = 'Text before ```const x = 1;``` text after';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Text before [code] text after');
        });
        it('should strip links [text](url)', () => {
            const content = 'Check out [this link](https://example.com) for more info';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Check out this link for more info');
        });
        it('should strip images ![alt](url)', () => {
            const content = 'Here is an image: ![alt text](https://example.com/image.png)';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Here is an image: alt text');
        });
        it('should strip headers (# text)', () => {
            const content = '# Header\nNormal text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Header Normal text');
        });
        it('should strip blockquotes (> text)', () => {
            const content = '> Quoted text\nNormal text';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Quoted text Normal text');
        });
        it('should strip list markers (- text)', () => {
            const content = '- Item 1\n- Item 2';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Item 1 Item 2');
        });
        it('should strip numbered list markers (1. text)', () => {
            const content = '1. First item\n2. Second item';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('First item Second item');
        });
        it('should normalize whitespace', () => {
            const content = 'Text   with    multiple     spaces';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Text with multiple spaces');
        });
        it('should handle complex markdown', () => {
            const content = '**Bold** and *italic* with `code` and [link](url) and ~~strikethrough~~';
            const preview = generateMessagePreview(content);
            expect(preview).toBe('Bold and italic with code and link and strikethrough');
        });
        it('should use default max length of 100', () => {
            const content = 'a'.repeat(200);
            const preview = generateMessagePreview(content);
            expect(preview.length).toBeLessThanOrEqual(103);
        });
    });
    describe('sanitizeMessageContent', () => {
        it('should trim whitespace', () => {
            expect(sanitizeMessageContent('  content  ')).toBe('content');
        });
        it('should preserve content', () => {
            const content = 'Normal message content';
            expect(sanitizeMessageContent(content)).toBe(content);
        });
        it('should preserve markdown', () => {
            const content = '**Bold** and *italic*';
            expect(sanitizeMessageContent(content)).toBe(content);
        });
    });
});
//# sourceMappingURL=message.utils.test.js.map