export interface SyntaxHighlightResult {
    html: string;
    language?: string;
}
declare class SyntaxHighlightService {
    constructor();
    getSupportedLanguages(): string[];
    isLanguageSupported(language: string): boolean;
    highlightCode(code: string, language?: string): SyntaxHighlightResult;
    private mapToKnownLanguage;
    private escapeHtml;
}
export declare const syntaxHighlightService: SyntaxHighlightService;
export {};
//# sourceMappingURL=syntax-highlight.service.d.ts.map