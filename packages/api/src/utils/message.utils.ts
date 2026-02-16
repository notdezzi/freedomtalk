/**
 * Message Utility Functions
 * 
 * Provides helper functions for message processing:
 * - Preview generation with markdown stripping
 * - Content sanitization
 */

/**
 * Generate a preview of message content
 * 
 * Strips markdown formatting and truncates to specified length.
 * Useful for notifications, search results, and message lists.
 * 
 * @param content - Full message content
 * @param maxLength - Maximum preview length (default: 100)
 * @returns Preview string with ellipsis if truncated
 * 
 * @example
 * generateMessagePreview('**Hello** world! This is a long message...', 20)
 * // Returns: 'Hello world! This...'
 */
export function generateMessagePreview(content: string, maxLength = 100): string {
  if (!content || content.trim().length === 0) {
    return '';
  }

  // Strip markdown formatting
  let preview = content
    // Remove code blocks (```code```)
    .replace(/```[\s\S]*?```/g, '[code]')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold (**text** or __text__)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    // Remove italic (*text* or _text_)
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Remove images ![alt](url) - must come before links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers (# text)
    .replace(/^#+\s+/gm, '')
    // Remove blockquotes (> text)
    .replace(/^>\s+/gm, '')
    // Remove list markers (- text, * text, 1. text)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate if needed
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength).trim() + '...';
  }

  return preview;
}

/**
 * Sanitize message content
 * 
 * Removes potentially harmful content while preserving markdown.
 * Currently a placeholder for future XSS prevention.
 * 
 * @param content - Message content to sanitize
 * @returns Sanitized content
 */
export function sanitizeMessageContent(content: string): string {
  // For now, just trim whitespace
  // In the future, this could include:
  // - XSS prevention
  // - Script tag removal
  // - Dangerous URL filtering
  return content.trim();
}

