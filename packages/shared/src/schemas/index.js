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
    channelId: z.string().uuid('Invalid channel ID'),
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
//# sourceMappingURL=index.js.map