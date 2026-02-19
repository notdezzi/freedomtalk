/**
 * Permission Utilities
 * Helper functions for bit manipulation and permission operations
 */

import { PERMISSION_FLAGS, Permissions, PermissionState } from '@freedomtalk/shared';

/**
 * Check if a permission set has a specific permission flag
 * This considers the ADMINISTRATOR flag which grants all permissions
 */
export function hasPermission(permissions: bigint, flag: bigint): boolean {
  return Permissions.has(permissions, flag);
}

/**
 * Get the state of a specific permission from allow/deny bitmasks
 * Returns 'allow', 'deny', or 'neutral'
 */
export function getPermissionState(allow: bigint, deny: bigint, flag: bigint): PermissionState {
  // Check if explicitly allowed
  if ((allow & flag) === flag) {
    return 'allow';
  }

  // Check if explicitly denied
  if ((deny & flag) === flag) {
    return 'deny';
  }

  // Not set in either = neutral
  return 'neutral';
}

/**
 * Set a permission to a specific state in allow/deny bitmasks
 * Returns updated allow and deny values
 */
export function setPermission(
  allow: bigint,
  deny: bigint,
  flag: bigint,
  state: 'allow' | 'deny' | 'neutral'
): { allow: bigint; deny: bigint } {
  switch (state) {
    case 'allow':
      // Set in allow, clear from deny
      return {
        allow: allow | flag,
        deny: deny & ~flag,
      };

    case 'deny':
      // Set in deny, clear from allow
      return {
        allow: allow & ~flag,
        deny: deny | flag,
      };

    case 'neutral':
      // Clear from both
      return {
        allow: allow & ~flag,
        deny: deny & ~flag,
      };
  }
}

/**
 * Clear a permission from both allow and deny bitmasks
 */
export function clearPermission(allow: bigint, deny: bigint, flag: bigint): { allow: bigint; deny: bigint } {
  return {
    allow: allow & ~flag,
    deny: deny & ~flag,
  };
}

/**
 * Apply an overwrite to existing permissions
 * First removes denied permissions, then adds allowed permissions
 */
export function applyOverwrite(
  permissions: bigint,
  overwriteAllow: bigint,
  overwriteDeny: bigint
): bigint {
  // First deny, then allow (allow takes precedence)
  return (permissions & ~overwriteDeny) | overwriteAllow;
}

/**
 * Merge multiple permission sets together
 * For allow: OR operation (any allow grants permission)
 * For deny: OR operation (any deny blocks permission)
 */
export function mergePermissions(
  ...permissionSets: Array<{ allow: bigint; deny: bigint }>
): { allow: bigint; deny: bigint } {
  let allow = 0n;
  let deny = 0n;

  for (const set of permissionSets) {
    allow |= set.allow;
    deny |= set.deny;
  }

  return { allow, deny };
}

/**
 * Resolve a single permission from allow/deny bitmasks
 * Returns the final state (allow or deny)
 */
export function resolvePermissionFromMasks(
  allow: bigint,
  deny: bigint,
  flag: bigint
): 'allow' | 'deny' {
  const state = getPermissionState(allow, deny, flag);
  // Neutral defaults to deny
  return state === 'allow' ? 'allow' : 'deny';
}

/**
 * Convert a bigint permission value to a string for database storage
 */
export function permissionToString(permissions: bigint): string {
  return permissions.toString();
}

/**
 * Convert a string from database to bigint permission value
 * Handles null, undefined, and invalid values gracefully
 */
export function stringToPermission(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined) {
    return 0n;
  }

  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/**
 * Check if the ADMINISTRATOR permission is set
 * This permission bypasses all other checks
 */
export function hasAdministrator(allow: bigint): boolean {
  return (allow & PERMISSION_FLAGS.ADMINISTRATOR) === PERMISSION_FLAGS.ADMINISTRATOR;
}

/**
 * Get all permission flags that are set in a bitmask
 * Returns an array of permission flag names
 */
export function getPermissionFlags(permissions: bigint): string[] {
  return Permissions.toArray(permissions);
}

/**
 * Get all permission flag names for display
 */
export function getPermissionNames(permissions: bigint): string[] {
  return Permissions.getNames(permissions);
}

/**
 * Calculate the effective permissions after waterfall resolution
 * Takes an array of {allow, deny} objects and resolves them in order
 * Returns final {allow, deny} state
 */
export function calculateEffectiveFromRoles(
  roles: Array<{ allow: bigint; deny: bigint; position: number }>
): { allow: bigint; deny: bigint } {
  // Sort by position descending (highest first)
  const sorted = [...roles].sort((a, b) => b.position - a.position);

  let effectiveAllow = 0n;
  let effectiveDeny = 0n;

  for (const role of sorted) {
    // For each role, only set permissions that haven't been decided yet
    // A decision is made when a permission is in either allow OR deny

    // Get permissions not yet decided
    const undecided = ~(effectiveAllow | effectiveDeny);

    // Add role's decisions for undecided permissions
    effectiveAllow |= role.allow & undecided;
    effectiveDeny |= role.deny & undecided;
  }

  return { allow: effectiveAllow, deny: effectiveDeny };
}

/**
 * Check if a user has all specified permissions
 */
export function hasAllPermissions(permissions: bigint, ...flags: bigint[]): boolean {
  return Permissions.hasAll(permissions, ...flags);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(permissions: bigint, ...flags: bigint[]): boolean {
  return Permissions.hasAny(permissions, ...flags);
}

/**
 * Get all permission flags as an array of [name, value] pairs
 */
export function getAllPermissionFlags(): Array<[string, bigint]> {
  return Object.entries(PERMISSION_FLAGS) as Array<[string, bigint]>;
}
