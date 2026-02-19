/**
 * Shared Zod validation schemas
 */
import { z } from 'zod';
import { VALIDATION } from '../constants';

// Auth schemas
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

// Message schemas
export const createMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(VALIDATION.MESSAGE.MAX_LENGTH, `Message must be at most ${VALIDATION.MESSAGE.MAX_LENGTH} characters`),
  // Snowflake ID format (20 characters). Optional to support DM messages (Milestone 2.4) which don't require channels
  channelId: z.string().length(20, 'Invalid channel ID').optional(),
});

// Server schemas
export const createServerSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.SERVER_NAME.MIN_LENGTH, `Server name must be at least ${VALIDATION.SERVER_NAME.MIN_LENGTH} characters`)
    .max(VALIDATION.SERVER_NAME.MAX_LENGTH, `Server name must be at most ${VALIDATION.SERVER_NAME.MAX_LENGTH} characters`),
  icon: z.string().url('Invalid icon URL').optional(),
});

// Channel schemas
export const createChannelSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.CHANNEL_NAME.MIN_LENGTH, `Channel name must be at least ${VALIDATION.CHANNEL_NAME.MIN_LENGTH} characters`)
    .max(VALIDATION.CHANNEL_NAME.MAX_LENGTH, `Channel name must be at most ${VALIDATION.CHANNEL_NAME.MAX_LENGTH} characters`),
  type: z.enum(['text', 'voice']),
  serverId: z.string().uuid('Invalid server ID'),
});

// User profile schemas
export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  pronouns: z.string().max(50).optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  banner_url: z.string().url('Invalid banner URL').optional(),
  custom_status: z.string().max(200).optional(),
});

// Token schemas
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// MFA schemas
export const mfaVerifySchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits').regex(/^\d{6}$/, 'MFA code must be numeric'),
});

// OAuth2 schemas
export const oauth2CallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

// Search schemas
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

// Discovery schemas
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

// API Response wrapper type
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

// Export types inferred from schemas
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

// Privacy schemas
export * from './privacy.schema';

