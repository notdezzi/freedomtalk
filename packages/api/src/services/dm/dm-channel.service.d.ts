import { DMChannel } from './dm-channel.types';
export interface DMChannelParticipant {
    id: string;
    dm_channel_id: string;
    user_id: string;
    joined_at: Date;
    left_at: Date | null;
    is_active: boolean;
}
export interface DMChannelWithParticipants extends DMChannel {
    participants: DMChannelParticipant[];
}
export interface CreateDMRequest {
    recipientId: string;
}
export interface CreateGroupDMRequest {
    participantIds: string[];
    name?: string;
    iconUrl?: string;
}
export interface UpdateGroupDMRequest {
    name?: string;
    iconUrl?: string;
}
declare class DMChannelService {
    createDM(userId1: string, userId2: string): Promise<DMChannelWithParticipants>;
    createGroupDM(ownerId: string, participantIds: string[], name?: string, iconUrl?: string): Promise<DMChannelWithParticipants>;
    getDMById(dmChannelId: string): Promise<DMChannelWithParticipants>;
    getDMByParticipants(userId1: string, userId2: string): Promise<DMChannelWithParticipants | null>;
    getDMsByUser(userId: string, limit?: number, offset?: number): Promise<{
        dmChannels: DMChannelWithParticipants[];
        total: number;
    }>;
    addParticipant(dmChannelId: string, userId: string, requesterId: string): Promise<DMChannelWithParticipants>;
    removeParticipant(dmChannelId: string, userId: string, requesterId: string): Promise<DMChannelWithParticipants>;
    updateGroupDM(dmChannelId: string, updates: UpdateGroupDMRequest, requesterId: string): Promise<DMChannelWithParticipants>;
    deleteDM(dmChannelId: string, userId: string): Promise<void>;
    isParticipant(dmChannelId: string, userId: string): Promise<boolean>;
    getParticipantUserIds(dmChannelId: string): Promise<string[]>;
}
export declare const dmChannelService: DMChannelService;
export {};
//# sourceMappingURL=dm-channel.service.d.ts.map