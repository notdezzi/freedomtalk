/**
 * useCan Hook - Permission checking for conditional rendering
 *
 * Provides a convenient way to check server-level and channel-level permissions
 * in React components.
 *
 * @example
 * // Server-level permission check
 * const canManageServer = useCan(serverId, PERMISSION_FLAGS.MANAGE_SERVER);
 *
 * @example
 * // Channel-level permission check
 * const canMessage = useCan(serverId, channelId, PERMISSION_FLAGS.SEND_MESSAGES);
 */

import { useMemo } from 'react';
import { usePermissionBreakdown, useChannelPermissionBreakdown } from '@/features/permissions';
import { PERMISSION_FLAGS, type PermissionFlag } from '@freedomtalk/shared';

type PermissionDecision = {
  result: 'allow' | 'deny';
};

function getPermissionMap(breakdown: unknown): Record<string, PermissionDecision> | null {
  if (!breakdown || typeof breakdown !== 'object') {
    return null;
  }

  if ('permissions' in breakdown && breakdown.permissions && typeof breakdown.permissions === 'object') {
    return breakdown.permissions as Record<string, PermissionDecision>;
  }

  return breakdown as Record<string, PermissionDecision>;
}

/**
 * Helper to find permission name from flag value.
 * Returns the key name (e.g., 'MANAGE_SERVER') for a given bigint flag.
 */
function getPermissionName(flag: bigint): PermissionFlag | undefined {
  for (const [name, value] of Object.entries(PERMISSION_FLAGS)) {
    if (value === flag) {
      return name as PermissionFlag;
    }
  }
  return undefined;
}

/**
 * Check server-level permissions
 * @param serverId - The server ID to check permissions in
 * @param permission - The permission flag to check
 * @returns true if the user has the permission, false otherwise
 *
 * @example
 * const canManageServer = useCan(serverId, PERMISSION_FLAGS.MANAGE_SERVER);
 * if (canManageServer) { ... }
 */
export function useCan(serverId: string | undefined, permission: bigint): boolean;

/**
 * Check channel-level permissions
 * @param serverId - The server ID (used for context, not directly for permission check)
 * @param channelId - The channel ID to check permissions in
 * @param permission - The permission flag to check
 * @returns true if the user has the permission, false otherwise
 *
 * @example
 * const canMessage = useCan(serverId, channelId, PERMISSION_FLAGS.SEND_MESSAGES);
 * if (canMessage) { ... }
 */
export function useCan(
  serverId: string | undefined,
  channelId: string | undefined,
  permission: bigint
): boolean;

/**
 * Implementation overload
 *
 * Determines which version is being called based on argument types:
 * - 2 arguments (serverId, permission) -> server-level check
 * - 3 arguments (serverId, channelId, permission) -> channel-level check
 */
export function useCan(
  serverId: string | undefined,
  permissionOrChannelId: bigint | string | undefined,
  permission?: bigint
): boolean {
  // Determine which overload is being used based on argument types
  const isChannelVersion = typeof permissionOrChannelId === 'string' || permission !== undefined;

  if (isChannelVersion) {
    // Channel-level permission check
    const channelId = permissionOrChannelId as string | undefined;
    const perm = permission!;

    const { data: breakdown } = useChannelPermissionBreakdown(channelId);

    return useMemo(() => {
      const permissions = getPermissionMap(breakdown);
      if (!permissions) return false;

      const permName = getPermissionName(perm);
      if (!permName) return false;

      return permissions[permName]?.result === 'allow';
    }, [breakdown, perm]);
  } else {
    // Server-level permission check
    const perm = permissionOrChannelId as bigint;

    const { data: breakdown } = usePermissionBreakdown(serverId);

    return useMemo(() => {
      const permissions = getPermissionMap(breakdown);
      if (!permissions) return false;

      const permName = getPermissionName(perm);
      if (!permName) return false;

      return permissions[permName]?.result === 'allow';
    }, [breakdown, serverId, perm]);
  }
}
