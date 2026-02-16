export interface MarkdownParseResult {
    html: string;
}
declare class MarkdownService {
    parseMarkdown(content: string): Promise<MarkdownParseResult>;
    stripMarkdown(content: string): string;
}
export declare const markdownService: MarkdownService;
export {};
//# sourceMappingURL=markdown.service.d.ts.map