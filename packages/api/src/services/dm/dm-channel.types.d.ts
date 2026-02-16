export type DMChannelType = 'dm' | 'group_dm';
export interface DMChannel {
    id: string;
    type: DMChannelType;
    name: string | null;
    icon_url: string | null;
    owner_id: string | null;
    created_at: Date;
    updated_at: Date;
}
export interface DMChannelResponse {
    id: string;
    type: DMChannelType;
    name: string | null;
    iconUrl: string | null;
    ownerId: string | null;
    createdAt: string;
    updatedAt: string;
    participants: DMChannelParticipantResponse[];
}
export interface DMChannelParticipantResponse {
    id: string;
    userId: string;
    joinedAt: string;
    leftAt: string | null;
    isActive: boolean;
}
export declare function toDMChannelResponse(dmChannel: any, participants: any[]): DMChannelResponse;
//# sourceMappingURL=dm-channel.types.d.ts.map