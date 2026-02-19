/**
 * Role Zod validation schemas
 *
 * Supports three-state permission model: Allow, Neutral, Deny
 * - Bit set in `allow` only -> Allow
 * - Bit set in `deny` only -> Deny
 * - Bit not set in either -> Neutral
 * - Bit set in both -> Allow wins (for safety)
 */
import { z } from 'zod';

/**
 * Schema for creating a new role
 *
 * Note: '@everyone' is a reserved role name that cannot be used.
 * The @everyone role is automatically created with every server.
 */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name must be at least 1 character')
    .max(100, 'Role name must be at most 100 characters')
    .refine(
      (name) => name.toLowerCase() !== '@everyone',
      "'@everyone' is a reserved role name"
    ),
  color: z
    .number()
    .int('Color must be an integer')
    .min(0, 'Color must be at least 0')
    .max(16777215, 'Color must be at most 16777215 (0xFFFFFF)')
    .default(0),
  hoist: z.boolean().default(false),
  mentionable: z.boolean().default(true),
  allowPermissions: z.bigint().default(0n),
  denyPermissions: z.bigint().default(0n),
});

/**
 * Schema for updating a role
 * All fields are optional for partial updates
 */
export const updateRoleSchema = createRoleSchema.partial();

/**
 * Schema for updating role positions
 * Used for reordering roles in the hierarchy
 */
export const updateRolePositionsSchema = z.object({
  positions: z
    .array(
      z.object({
        id: z.string().min(1, 'Role ID is required'),
        position: z.number().int('Position must be an integer'),
      })
    )
    .min(1, 'At least one position update is required'),
});

// Export types inferred from schemas
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateRolePositionsInput = z.infer<typeof updateRolePositionsSchema>;
