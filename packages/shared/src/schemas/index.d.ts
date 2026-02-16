import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
}, {
    password: string;
    email: string;
}>;
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    email: string;
}, {
    username: string;
    password: string;
    email: string;
}>;
export declare const createMessageSchema: z.ZodObject<{
    content: z.ZodString;
    channelId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    channelId: string;
}, {
    content: string;
    channelId: string;
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
    type: "text" | "voice";
    name: string;
    serverId: string;
}, {
    type: "text" | "voice";
    name: string;
    serverId: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateServerInput = z.infer<typeof createServerSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
//# sourceMappingURL=index.d.ts.map