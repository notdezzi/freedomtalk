import { ChannelType } from '@freedomtalk/shared';
export interface ChannelData {
    id: string;
    server_id: string;
    category_id: string | null;
    name: string;
    type: string;
    topic: string | null;
    position: number;
    nsfw: boolean;
    rate_limit_per_user: number;
    parent_id: string | null;
    last_message_id: string | null;
    bitrate: number | null;
    user_limit: number | null;
    rtc_region: string | null;
    created_at: Date;
    updated_at: Date;
}
export interface CreateChannelInput {
    serverId: string;
    categoryId?: string;
    name: string;
    type: ChannelType;
    topic?: string;
    position?: number;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    bitrate?: number;
    userLimit?: number;
    rtcRegion?: string;
}
export interface UpdateChannelInput {
    name?: string;
    topic?: string | null;
    position?: number;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    bitrate?: number;
    userLimit?: number;
    rtcRegion?: string | null;
    categoryId?: string | null;
}
declare class ChannelService {
    createChannel(input: CreateChannelInput): Promise<ChannelData>;
    getChannel(channelId: string): Promise<ChannelData | null>;
    getServerChannels(serverId: string): Promise<ChannelData[]>;
    getCategoryChannels(categoryId: string): Promise<ChannelData[]>;
    updateChannel(channelId: string, input: UpdateChannelInput): Promise<ChannelData>;
    deleteChannel(channelId: string): Promise<void>;
    updateChannelPositions(serverId: string, positions: {
        id: string;
        position: number;
        categoryId?: string | null;
    }[]): Promise<ChannelData[]>;
    updateLastMessage(channelId: string, messageId: string): Promise<void>;
    getChannelWithOverwrites(channelId: string): Promise<{
        channel: ChannelData;
        overwrites: Array<{
            id: string;
            target_id: string;
            target_type: string;
            allow: string;
            deny: string;
        }>;
    } | null>;
}
export declare const channelService: ChannelService;
export {};
//# sourceMappingURL=channel.service.d.ts.map