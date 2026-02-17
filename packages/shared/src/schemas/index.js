import { z } from 'zod';
import { VALIDATION } from '../constants';
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(VALIDATION.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters`)
        .max(VALIDATION.PASSWORD.MAX_LENGTH, `Password must be at most ${VALIDATION.PASSWORD.MAX_LENGTH} characters`),
});
export const registerSchema = z.object({
    username: z
        .string()
        .min(VALIDATION.USERNAME.MIN_LENGTH, `Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} characters`)
        .max(VALIDATION.USERNAME.MAX_LENGTH, `Username must be at most ${VALIDATION.USERNAME.MAX_LENGTH} characters`)
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(VALIDATION.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters`)
        .max(VALIDATION.PASSWORD.MAX_LENGTH, `Password must be at most ${VALIDATION.PASSWORD.MAX_LENGTH} characters`),
});
export const createMessageSchema = z.object({
    content: z
        .string()
        .min(1, 'Message cannot be empty')
        .max(VALIDATION.MESSAGE.MAX_LENGTH, `Message must be at most ${VALIDATION.MESSAGE.MAX_LENGTH} characters`),
    channelId: z.string().length(20, 'Invalid channel ID').optional(),
});
export const createServerSchema = z.object({
    name: z
        .string()
        .min(VALIDATION.SERVER_NAME.MIN_LENGTH, `Server name must be at least ${VALIDATION.SERVER_NAME.MIN_LENGTH} characters`)
        .max(VALIDATION.SERVER_NAME.MAX_LENGTH, `Server name must be at most ${VALIDATION.SERVER_NAME.MAX_LENGTH} characters`),
    icon: z.string().url('Invalid icon URL').optional(),
});
export const createChannelSchema = z.object({
    name: z
        .string()
        .min(VALIDATION.CHANNEL_NAME.MIN_LENGTH, `Channel name must be at least ${VALIDATION.CHANNEL_NAME.MIN_LENGTH} characters`)
        .max(VALIDATION.CHANNEL_NAME.MAX_LENGTH, `Channel name must be at most ${VALIDATION.CHANNEL_NAME.MAX_LENGTH} characters`),
    type: z.enum(['text', 'voice']),
    serverId: z.string().uuid('Invalid server ID'),
});
export const updateProfileSchema = z.object({
    display_name: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    pronouns: z.string().max(50).optional(),
    avatar_url: z.string().url('Invalid avatar URL').optional(),
    banner_url: z.string().url('Invalid banner URL').optional(),
    custom_status: z.string().max(200).optional(),
});
export const refreshTokenSchema = z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
});
export const mfaVerifySchema = z.object({
    code: z.string().length(6, 'MFA code must be 6 digits').regex(/^\d{6}$/, 'MFA code must be numeric'),
});
export const oauth2CallbackSchema = z.object({
    code: z.string().min(1, 'Authorization code is required'),
    state: z.string().min(1, 'State parameter is required'),
});
export const searchMessagesSchema = z.object({
    query: z.string().min(1, 'Search query is required').max(500, 'Query too long'),
    channel_id: z.string().length(20, 'Invalid channel ID').optional(),
    server_id: z.string().length(20, 'Invalid server ID').optional(),
    author_id: z.string().length(20, 'Invalid author ID').optional(),
    limit: z.number().int().min(1).max(100).default(50).optional(),
    offset: z.number().int().min(0).default(0).optional(),
});
export const searchUsersSchema = z.object({
    query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
    limit: z.number().int().min(1).max(100).default(25).optional(),
    offset: z.number().int().min(0).default(0).optional(),
});
export const searchServersSchema = z.object({
    query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
    category: z.string().max(50).optional(),
    min_members: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(100).default(25).optional(),
    offset: z.number().int().min(0).default(0).optional(),
});
export const autocompleteSchema = z.object({
    type: z.enum(['messages', 'users', 'servers']),
    prefix: z.string().min(1, 'Prefix is required').max(100, 'Prefix too long'),
    limit: z.number().int().min(1).max(20).default(10).optional(),
});
export const discoveryServersSchema = z.object({
    category: z.string().max(50).optional(),
    sort: z.enum(['member_count', 'recent', 'relevance']).default('member_count').optional(),
    limit: z.number().int().min(1).max(100).default(25).optional(),
    offset: z.number().int().min(0).default(0).optional(),
});
export const updateDiscoverySettingsSchema = z.object({
    is_discoverable: z.boolean().optional(),
    category: z.string().max(50).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    discovery_description: z.string().max(500).optional(),
});
//# sourceMappingURL=index.js.map