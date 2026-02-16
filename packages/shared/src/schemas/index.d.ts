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
    username: string;
    password: string;
}, {
    email: string;
    username: string;
    password: string;
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
//# sourceMappingURL=index.d.ts.map