/**
 * Permission Service Module
 * Exports all permission-related services, types, and utilities
 */

// Export main service
export { PermissionService, permissionService } from './permission.service';

// Export types
export type {
  PermissionResult,
  PermissionSource,
  PermissionDecision,
  PermissionBreakdown,
  ChannelPermissionBreakdown,
  AppliedOverwrite,
  RoleWithPermissions,
  PermissionOverwriteData,
  EffectivePermissions,
  ChannelInfo,
  CreateOverwriteInput,
  UpdateOverwriteInput,
  ResolvedPermission,
  MemberRole,
} from './permission.types';

// Export utility functions
export {
  hasPermission,
  getPermissionState,
  setPermission,
  clearPermission,
  applyOverwrite,
  mergePermissions,
  resolvePermissionFromMasks,
  permissionToString,
  stringToPermission,
  hasAdministrator,
  getPermissionFlags,
  getPermissionNames,
  calculateEffectiveFromRoles,
  hasAllPermissions,
  hasAnyPermission,
  getAllPermissionFlags,
} from './permission.utils';
