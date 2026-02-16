export type MentionType = 'user' | 'role' | 'channel' | 'everyone' | 'here';
export interface ParsedMention {
    type: MentionType;
    id?: string;
    raw: string;
}
export interface MentionValidationResult {
    valid: boolean;
    invalidMentions: ParsedMention[];
    errors: string[];
}
declare class MentionService {
    parseMentions(content: string): ParsedMention[];
    validateMentions(mentions: ParsedMention[], channelId?: string, serverId?: string): Promise<MentionValidationResult>;
    getMentionedUsers(content: string, _channelId?: string, serverId?: string): Promise<string[]>;
    replaceMentionsWithNames(content: string, serverId?: string): Promise<string>;
    suppressMentions(content: string): string;
    shouldNotifyUser(content: string, userId: string): boolean;
    countMentions(content: string): Record<MentionType, number>;
}
export declare const mentionService: MentionService;
export {};
//# sourceMappingURL=mention.service.d.ts.map