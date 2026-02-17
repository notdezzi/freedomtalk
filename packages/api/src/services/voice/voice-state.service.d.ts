export interface VoiceState {
    id: string;
    channel_id: string;
    user_id: string;
    server_id: string;
    session_id: string;
    self_mute: boolean;
    self_deaf: boolean;
    self_video: boolean;
    self_stream: boolean;
    suppress: boolean;
    request_to_speak_timestamp: Date | null;
    joined_at: Date;
}
export interface VoiceStateWithUser extends VoiceState {
    user?: {
        id: string;
        username: string;
        avatar: string | null;
    };
}
export interface CreateVoiceStateInput {
    channelId: string;
    userId: string;
    serverId: string;
    sessionId: string;
    selfMute?: boolean;
    selfDeaf?: boolean;
    selfVideo?: boolean;
}
export interface UpdateVoiceStateInput {
    selfMute?: boolean;
    selfDeaf?: boolean;
    selfVideo?: boolean;
    selfStream?: boolean;
    suppress?: boolean;
}
declare class VoiceStateService {
    private readonly MAX_USERS_PER_CHANNEL;
    createVoiceState(input: CreateVoiceStateInput): Promise<VoiceState>;
    deleteVoiceState(sessionId: string): Promise<void>;
    deleteVoiceStateByUserChannel(channelId: string, userId: string): Promise<void>;
    updateVoiceState(sessionId: string, input: UpdateVoiceStateInput): Promise<VoiceState>;
    getVoiceStateBySession(sessionId: string): Promise<VoiceState | null>;
    getVoiceStateByUserId(userId: string): Promise<VoiceState | null>;
    getUserVoiceStateInServer(serverId: string, userId: string): Promise<VoiceState | null>;
    getChannelVoiceStates(channelId: string): Promise<VoiceStateWithUser[]>;
    getServerVoiceStates(serverId: string): Promise<VoiceState[]>;
    getChannelUserCount(channelId: string): Promise<number>;
    moveUser(sessionId: string, targetChannelId: string): Promise<VoiceState>;
    suppressUser(sessionId: string, suppress: boolean): Promise<VoiceState>;
    kickUser(sessionId: string): Promise<void>;
    getChannelStreams(channelId: string): Promise<{
        video: number;
        screen: number;
    }>;
}
export declare const voiceStateService: VoiceStateService;
export {};
//# sourceMappingURL=voice-state.service.d.ts.map