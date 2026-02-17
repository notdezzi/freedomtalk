import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    username: string;
}, {
    email: string;
    password: string;
    username: string;
}>;
export declare const createMessageSchema: z.ZodObject<{
    content: z.ZodString;
    channelId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content: string;
    channelId?: string | undefined;
}, {
    content: string;
    channelId?: string | undefined;
}>;
export declare const createServerSchema: z.ZodObject<{
    name: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    icon?: string | undefined;
}, {
    name: string;
    icon?: string | undefined;
}>;
export declare const createChannelSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["text", "voice"]>;
    serverId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "text" | "voice";
    serverId: string;
}, {
    name: string;
    type: "text" | "voice";
    serverId: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    display_name: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    pronouns: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodOptional<z.ZodString>;
    banner_url: z.ZodOptional<z.ZodString>;
    custom_status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    display_name?: string | undefined;
    bio?: string | undefined;
    pronouns?: string | undefined;
    avatar_url?: string | undefined;
    banner_url?: string | undefined;
    custom_status?: string | undefined;
}, {
    display_name?: string | undefined;
    bio?: string | undefined;
    pronouns?: string | undefined;
    avatar_url?: string | undefined;
    banner_url?: string | undefined;
    custom_status?: string | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refresh_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refresh_token: string;
}, {
    refresh_token: string;
}>;
export declare const mfaVerifySchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export declare const oauth2CallbackSchema: z.ZodObject<{
    code: z.ZodString;
    state: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    state: string;
}, {
    code: string;
    state: string;
}>;
export declare const searchMessagesSchema: z.ZodObject<{
    query: z.ZodString;
    channel_id: z.ZodOptional<z.ZodString>;
    server_id: z.ZodOptional<z.ZodString>;
    author_id: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    offset?: number | undefined;
    author_id?: string | undefined;
    channel_id?: string | undefined;
    server_id?: string | undefined;
    limit?: number | undefined;
}, {
    query: string;
    offset?: number | undefined;
    author_id?: string | undefined;
    channel_id?: string | undefined;
    server_id?: string | undefined;
    limit?: number | undefined;
}>;
export declare const searchUsersSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    offset?: number | undefined;
    limit?: number | undefined;
}, {
    query: string;
    offset?: number | undefined;
    limit?: number | undefined;
}>;
export declare const searchServersSchema: z.ZodObject<{
    query: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    min_members: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    offset?: number | undefined;
    category?: string | undefined;
    limit?: number | undefined;
    min_members?: number | undefined;
}, {
    query: string;
    offset?: number | undefined;
    category?: string | undefined;
    limit?: number | undefined;
    min_members?: number | undefined;
}>;
export declare const autocompleteSchema: z.ZodObject<{
    type: z.ZodEnum<["messages", "users", "servers"]>;
    prefix: z.ZodString;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    type: "messages" | "users" | "servers";
    prefix: string;
    limit?: number | undefined;
}, {
    type: "messages" | "users" | "servers";
    prefix: string;
    limit?: number | undefined;
}>;
export declare const discoveryServersSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodDefault<z.ZodEnum<["member_count", "recent", "relevance"]>>>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    sort?: "member_count" | "recent" | "relevance" | undefined;
    offset?: number | undefined;
    category?: string | undefined;
    limit?: number | undefined;
}, {
    sort?: "member_count" | "recent" | "relevance" | undefined;
    offset?: number | undefined;
    category?: string | undefined;
    limit?: number | undefined;
}>;
export declare const updateDiscoverySettingsSchema: z.ZodObject<{
    is_discoverable: z.ZodOptional<z.ZodBoolean>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    discovery_description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    is_discoverable?: boolean | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    discovery_description?: string | undefined;
}, {
    is_discoverable?: boolean | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    discovery_description?: string | undefined;
}>;
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateServerInput = z.infer<typeof createServerSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type OAuth2CallbackInput = z.infer<typeof oauth2CallbackSchema>;
export type SearchMessagesInput = z.infer<typeof searchMessagesSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type SearchServersInput = z.infer<typeof searchServersSchema>;
export type AutocompleteInput = z.infer<typeof autocompleteSchema>;
export type DiscoveryServersInput = z.infer<typeof discoveryServersSchema>;
export type UpdateDiscoverySettingsInput = z.infer<typeof updateDiscoverySettingsSchema>;
//# sourceMappingURL=index.d.ts.map