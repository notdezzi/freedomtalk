/**
 * Markdown Parsing Service
 * Parses markdown content to HTML with basic Discord-specific support
 */

import { marked } from 'marked';
import { logger } from '../../config/logger';

/**
 * Markdown Parse Result interface
 */
export interface MarkdownParseResult {
  html: string;
}

/**
 * Markdown Service class
 */
class MarkdownService {
  /**
   * Parse markdown to HTML
   * @param content - Markdown content to parse
   * @returns HTML string
   */
  async parseMarkdown(content: string): Promise<MarkdownParseResult> {
    try {
      const html = await marked.parse(content, {
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert \n to <br>
      });

      return { html };
    } catch (error) {
      logger.error({ error, contentLength: content.length }, 'Error parsing markdown');
      // Return original content on error
      return { html: content };
    }
  }

  /**
   * Strip markdown formatting from content
   * @param content - Content with markdown
   * @returns Plain text without markdown
   */
  stripMarkdown(content: string): string {
    try {
      // Remove markdown syntax patterns
      let stripped = content
        // Headers
        .replace(/^#{1,6}\s+/gm, '')
        // Bold/Italic
        .replace(/(\*\*|__|~~|_)\1/g, '')
        // Links [text](url)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        // Code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Inline code
        .replace(/`[^`]+`/g, '')
        // Blockquotes
        .replace(/^\s*>\s*/gm, '')
        // Strikethrough
        .replace(/~~[^~]+~~/g, '')
        // Lists
        .replace(/^\s*[-*+]\s+/gm, '');

      return stripped.trim();
    } catch (error) {
      logger.error({ error }, 'Error stripping markdown');
      return content;
    }
  }
}

// Export singleton instance
export const markdownService = new MarkdownService();
