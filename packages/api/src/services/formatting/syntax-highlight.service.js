import hljs from 'highlight.js';
import { logger } from '../../config/logger';
const LANGUAGE_ALIASES = {
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
class SyntaxHighlightService {
    constructor() {
        logger.debug('Syntax highlight service initialized');
    }
    getSupportedLanguages() {
        return hljs.listLanguages();
    }
    isLanguageSupported(language) {
        return hljs.listLanguages().includes(language);
    }
    highlightCode(code, language) {
        try {
            let detectedLanguage = language;
            if (!detectedLanguage) {
                const result = hljs.highlightAuto(code);
                detectedLanguage = result.language || '';
                logger.debug({ autoDetected: result.language }, 'Auto-detected language');
            }
            else {
                detectedLanguage = this.mapToKnownLanguage(detectedLanguage);
            }
            const highlighted = hljs.highlight(code, {
                language: detectedLanguage || 'plaintext',
            });
            return {
                html: highlighted.value,
                language: detectedLanguage,
            };
        }
        catch (error) {
            logger.error({ error, language, codeLength: code.length }, 'Error highlighting code');
            return {
                html: this.escapeHtml(code),
                language: undefined,
            };
        }
    }
    mapToKnownLanguage(detectedLanguage) {
        if (!detectedLanguage) {
            return '';
        }
        const langLower = detectedLanguage.toLowerCase();
        if (langLower in LANGUAGE_ALIASES) {
            return LANGUAGE_ALIASES[langLower] || detectedLanguage;
        }
        const jsVariants = ['javascript', 'javascript-1.8', 'javascript-1.11', 'js', 'nodejs'];
        if (jsVariants.includes(langLower)) {
            return 'javascript';
        }
        const typeScriptVariants = ['typescript', 'ts'];
        if (typeScriptVariants.includes(langLower)) {
            return 'typescript';
        }
        return detectedLanguage;
    }
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
export const syntaxHighlightService = new SyntaxHighlightService();
//# sourceMappingURL=syntax-highlight.service.js.map