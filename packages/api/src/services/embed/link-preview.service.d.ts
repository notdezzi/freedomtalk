import { EmbedData } from './embed.service';
declare class LinkPreviewService {
    private readonly CACHE_TTL;
    private readonly TIMEOUT;
    private readonly USER_AGENT;
    private readonly URL_REGEX;
    extractUrls(content: string): string[];
    shouldGeneratePreview(url: string): boolean;
    getCachedPreview(url: string): Promise<EmbedData | null>;
    cachePreview(url: string, embedData: EmbedData): Promise<void>;
    generatePreview(url: string): Promise<EmbedData | null>;
}
export declare const linkPreviewService: LinkPreviewService;
export {};
//# sourceMappingURL=link-preview.service.d.ts.map