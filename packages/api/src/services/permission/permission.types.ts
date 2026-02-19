/**
 * Permission Service Types
 * Type definitions for the hierarchical permission system
 */

import type { PermissionState } from '@freedomtalk/shared';

/**
 * Result of a permission check - either allow or deny
 */
export type PermissionResult = 'allow' | 'deny';

/**
 * Source of a permission decision
 * Used for debugging and UI display of why a permission was granted/denied
 */
export type PermissionSource =
  | 'owner' // Server owner - has all permissions
  | 'administrator' // Has ADMINISTRATOR flag - bypasses overwrites
  | `role:${string}` // Permission from a specific role (role ID included)
  | 'overwrite:role' // Permission from a channel role overwrite
  | 'overwrite:member' // Permission from a channel member overwrite
  | 'overwrite:everyone' // Permission from @everyone channel overwrite
  | 'default'; // Default deny - no explicit permission found

/**
 * Breakdown of a single permission's resolution
 */
export interface PermissionDecision {
  result: PermissionResult;
  source: PermissionSource;
}

/**
 * Permission breakdown for a user in a server
 * Maps permission names to their resolution details
 */
export interface PermissionBreakdown {
  [permission: string]: PermissionDecision;
}

/**
 * Applied overwrite information
 */
export interface AppliedOverwrite {
  targetId: string;
  targetType: 'role' | 'member';
  targetName?: string;
  allow: string[];
  deny: string[];
}

/**
 * Extended breakdown for channel permissions
 * Includes information about applied overwrites
 */
export interface ChannelPermissionBreakdown {
  /** Permission decisions for each permission flag */
  permissions: PermissionBreakdown;
  /** List of overwrites that were applied */
  appliedOverwrites?: AppliedOverwrite[];
}

/**
 * Role data with three-state permissions from database
 */
export interface RoleWithPermissions {
  id: string;
  server_id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon: string | null;
  position: number;
  allow_permissions: string; // Stored as string in DB
  deny_permissions: string; // Stored as string in DB
  managed: boolean;
  mentionable: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Permission overwrite data from database
 */
export interface PermissionOverwriteData {
  id: string;
  channel_id: string;
  target_id: string;
  target_type: 'role' | 'member';
  allow: string; // Stored as string in DB
  deny: string; // Stored as string in DB
  created_at: Date;
  updated_at: Date;
}

/**
 * Effective permissions calculated from roles
 */
export interface EffectivePermissions {
  allow: bigint;
  deny: bigint;
}

/**
 * Channel information needed for permission resolution
 */
export interface ChannelInfo {
  id: string;
  server_id: string;
  type: 'text' | 'voice' | 'category';
  category_id: string | null;
}

/**
 * Input for creating/updating a permission overwrite
 */
export interface CreateOverwriteInput {
  channelId: string;
  targetId: string;
  targetType: 'role' | 'member';
  allow?: bigint;
  deny?: bigint;
}

/**
 * Input for updating an existing overwrite
 */
export interface UpdateOverwriteInput {
  allow?: bigint;
  deny?: bigint;
}

/**
 * Resolved permission state for a single flag
 */
export interface ResolvedPermission {
  state: PermissionState;
  source: PermissionSource;
}

/**
 * Member's role assignment
 */
export interface MemberRole {
  role_id: string;
  user_id: string;
  server_id: string;
}
