/**
 * Privacy validation schemas
 */
import { z } from 'zod';

export const dmPrivacyLevelSchema = z.enum(['open', 'friends_only', 'none']);

export const updatePrivacySchema = z.object({
  dmPrivacyLevel: dmPrivacyLevelSchema,
});

export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
