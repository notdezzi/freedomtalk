'use client';

import { cn } from '@/lib/utils';
import type { PermissionState, PermissionFlag } from '@freedomtalk/shared';
import { PERMISSION_NAMES } from '@freedomtalk/shared';
import { PermissionCheckbox } from '../shared/permission-checkbox';

export interface PermissionCategoryProps {
  /** Display name of the category */
  categoryName: string;
  /** List of permission keys in this category */
  permissions: readonly PermissionFlag[];
  /** Function to get the current state of a permission */
  getState: (permission: PermissionFlag) => PermissionState;
  /** Callback when a permission state changes */
  onChange: (permission: PermissionFlag, state: PermissionState) => void;
  /** Whether all permissions in this category are disabled */
  disabled?: boolean;
  /** Optional class name for styling */
  className?: string;
}

/**
 * Displays a category of permissions with a header and list of permission checkboxes.
 *
 * Used within the PermissionEditor to group related permissions together.
 */
export function PermissionCategory({
  categoryName,
  permissions,
  getState,
  onChange,
  disabled = false,
  className,
}: PermissionCategoryProps) {
  return (
    <div className={cn('mb-6', className)}>
      {/* Category Header */}
      <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3 px-1">
        {categoryName}
      </h4>

      {/* Permission List */}
      <div className="space-y-1 bg-background-elevated rounded-lg p-2">
        {permissions.map((permission) => (
          <PermissionCheckbox
            key={permission}
            label={PERMISSION_NAMES[permission] || permission}
            state={getState(permission)}
            onChange={(state) => onChange(permission, state)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
