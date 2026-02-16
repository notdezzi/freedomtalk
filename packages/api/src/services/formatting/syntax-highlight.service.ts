/**
 * Syntax Highlighting Service
 * Highlights code blocks with syntax highlighting using highlight.js
 */

import hljs from 'highlight.js';
import { logger } from '../../config/logger';

/**
 * Language mapping for common languages
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  rust: 'rust',
  go: 'go',
  ruby: 'ruby',
  php: 'php',
  html: 'html',
  css: 'css',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  powershell: 'powershell',
  ps: 'powershell',
  swift: 'swift',
  kotlin: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',
  lua: 'lua',
  r: 'r',
  perl: 'perl',
};

/**
 * Syntax Highlight Result interface
 */
export interface SyntaxHighlightResult {
  html: string;
  language?: string;
}

/**
 * Syntax Highlight Service class
 */
class SyntaxHighlightService {
  constructor() {
    // highlight.js already has common languages bundled, no need to register
    logger.debug('Syntax highlight service initialized');
  }

  /**
   * Get list of supported languages
   * @returns Array of language names
   */
  getSupportedLanguages(): string[] {
    return hljs.listLanguages();
  }

  /**
   * Check if a language is supported
   * @param language - Language name
   * @returns True if supported
   */
  isLanguageSupported(language: string): boolean {
    return hljs.listLanguages().includes(language);
  }

  /**
   * Highlight code with syntax highlighting
   * @param code - Source code to highlight
   * @param language - Programming language (optional)
   * @returns HTML with syntax highlighting
   */
  highlightCode(code: string, language?: string): SyntaxHighlightResult {
    try {
      // Auto-detect language if not specified
      let detectedLanguage = language;
      if (!detectedLanguage) {
        const result = hljs.highlightAuto(code);
        detectedLanguage = result.language || '';
        logger.debug({ autoDetected: result.language }, 'Auto-detected language');
      } else {
        detectedLanguage = this.mapToKnownLanguage(detectedLanguage);
      }

      // Highlight the code
      const highlighted = hljs.highlight(code, {
        language: detectedLanguage || 'plaintext',
      });

      return {
        html: highlighted.value,
        language: detectedLanguage,
      };
    } catch (error) {
      logger.error({ error, language, codeLength: code.length }, 'Error highlighting code');
      // Return escaped code on error
      return {
        html: this.escapeHtml(code),
        language: undefined,
      };
    }
  }

  /**
   * Map auto-detected language to known language alias
   * @param detectedLanguage - Auto-detected language name
   * @returns Mapped language name
   */
  private mapToKnownLanguage(detectedLanguage: string | undefined): string {
    if (!detectedLanguage) {
      return '';
    }

    const langLower = detectedLanguage.toLowerCase();

    // Check direct match
    if (langLower in LANGUAGE_ALIASES) {
      return LANGUAGE_ALIASES[langLower] || detectedLanguage;
    }

    // Check for known language patterns
    const jsVariants = ['javascript', 'javascript-1.8', 'javascript-1.11', 'js', 'nodejs'];
    if (jsVariants.includes(langLower)) {
      return 'javascript';
    }

    const typeScriptVariants = ['typescript', 'ts'];
    if (typeScriptVariants.includes(langLower)) {
      return 'typescript';
    }

    // Default to original language name
    return detectedLanguage;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Export singleton instance
export const syntaxHighlightService = new SyntaxHighlightService();
