import { marked } from 'marked';
import { logger } from '../../config/logger';
class MarkdownService {
    async parseMarkdown(content) {
        try {
            const html = await marked.parse(content, {
                gfm: true,
                breaks: true,
            });
            return { html };
        }
        catch (error) {
            logger.error({ error, contentLength: content.length }, 'Error parsing markdown');
            return { html: content };
        }
    }
    stripMarkdown(content) {
        try {
            let stripped = content
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/(\*\*|__|~~|_)\1/g, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/`[^`]+`/g, '')
                .replace(/^\s*>\s*/gm, '')
                .replace(/~~[^~]+~~/g, '')
                .replace(/^\s*[-*+]\s+/gm, '');
            return stripped.trim();
        }
        catch (error) {
            logger.error({ error }, 'Error stripping markdown');
            return content;
        }
    }
}
export const markdownService = new MarkdownService();
//# sourceMappingURL=markdown.service.js.map