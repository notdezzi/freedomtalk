export interface EmbedField {
    name: string;
    value: string;
    inline?: boolean;
}
export interface EmbedData {
    type?: 'rich' | 'image' | 'video' | 'link' | 'article';
    title?: string;
    description?: string;
    url?: string;
    timestamp?: Date | string;
    color?: number;
    footer_text?: string;
    footer_icon_url?: string;
    image_url?: string;
    thumbnail_url?: string;
    author_name?: string;
    author_url?: string;
    author_icon_url?: string;
    fields?: EmbedField[];
}
export interface Embed {
    id: string;
    message_id: string;
    type: 'rich' | 'image' | 'video' | 'link' | 'article';
    title: string | null;
    description: string | null;
    url: string | null;
    timestamp: Date | null;
    color: number | null;
    footer_text: string | null;
    footer_icon_url: string | null;
    image_url: string | null;
    thumbnail_url: string | null;
    author_name: string | null;
    author_url: string | null;
    author_icon_url: string | null;
    fields: EmbedField[] | null;
    created_at: Date;
}
declare class EmbedService {
    validateEmbedData(embedData: EmbedData): void;
    calculateTotalCharacters(embedData: EmbedData): number;
    createEmbed(messageId: string, embedData: EmbedData): Promise<Embed>;
    createEmbeds(messageId: string, embeds: EmbedData[]): Promise<Embed[]>;
    getEmbedsByMessage(messageId: string): Promise<Embed[]>;
    updateEmbed(embedId: string, embedData: EmbedData): Promise<Embed>;
    deleteEmbed(embedId: string): Promise<boolean>;
}
export declare const embedService: EmbedService;
export {};
//# sourceMappingURL=embed.service.d.ts.map