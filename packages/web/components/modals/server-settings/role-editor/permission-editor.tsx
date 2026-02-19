'use client';

import { cn } from '@/lib/utils';
import {
  PERMISSION_FLAGS,
  PERMISSION_CATEGORIES,
  PERMISSION_NAMES,
  type PermissionState,
  type PermissionFlag,
} from '@freedomtalk/shared';
import { PermissionCategory } from './permission-category';
import { AlertTriangle } from 'lucide-react';

export interface PermissionEditorProps {
  /** Bitmask of allowed permissions */
  allowPermissions: bigint;
  /** Bitmask of denied permissions */
  denyPermissions: bigint;
  /** Callback when permissions change */
  onChange: (allow: bigint, deny: bigint) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Optional class name for styling */
  className?: string;
}

/**
 * Category display names for the UI
 */
const CATEGORY_LABELS: Record<keyof typeof PERMISSION_CATEGORIES, string> = {
  general: 'General Server Permissions',
  membership: 'Membership Permissions',
  text: 'Text Channel Permissions',
  voice: 'Voice Permissions',
  advanced: 'Advanced Permissions',
};

/**
 * Main permission editor component for role permission editing.
 *
 * Displays all 5 categories of permissions with 3-state checkboxes.
 * Shows a warning for the ADMINISTRATOR permission about granting full access.
 *
 * States cycle: Neutral -> Allow -> Deny -> Neutral
 */
export function PermissionEditor({
  allowPermissions,
  denyPermissions,
  onChange,
  disabled = false,
  className,
}: PermissionEditorProps) {
  /**
   * Get the current state of a permission based on allow/deny bitmasks
   */
  const getPermissionState = (permission: PermissionFlag): PermissionState => {
    const flag = PERMISSION_FLAGS[permission];
    const isAllowed = (allowPermissions & flag) === flag;
    const isDenied = (denyPermissions & flag) === flag;

    if (isAllowed) return 'allow';
    if (isDenied) return 'deny';
    return 'neutral';
  };

  /**
   * Handle permission state change
   */
  const handlePermissionChange = (
    permission: PermissionFlag,
    state: PermissionState
  ) => {
    const flag = PERMISSION_FLAGS[permission];

    // First, clear the permission from both allow and deny
    let newAllow = allowPermissions & ~flag;
    let newDeny = denyPermissions & ~flag;

    // Then set it based on the new state
    if (state === 'allow') {
      newAllow = newAllow | flag;
    } else if (state === 'deny') {
      newDeny = newDeny | flag;
    }

    onChange(newAllow, newDeny);
  };

  /**
   * Check if administrator permission is allowed
   */
  const hasAdministrator = getPermissionState('ADMINISTRATOR') === 'allow';

  return (
    <div className={cn('space-y-2', className)}>
      {/* Administrator Warning */}
      {hasAdministrator && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-500">
                Administrator Permission
              </h4>
              <p className="text-xs text-yellow-500/80 mt-1">
                Members with this permission have full access to all permissions
                and bypasses all channel permission overwrites. Grant this
                permission with caution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Permission Categories */}
      {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, permissions]) => (
        <PermissionCategory
          key={categoryKey}
          categoryName={CATEGORY_LABELS[categoryKey as keyof typeof PERMISSION_CATEGORIES]}
          permissions={permissions}
          getState={getPermissionState}
          onChange={handlePermissionChange}
          disabled={disabled}
        />
      ))}

      {/* Permission Legend */}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-foreground-muted mb-2">
          Permission States:
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border-2 border-border bg-transparent flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full border border-border" />
            </div>
            <span className="text-xs text-foreground-muted">Neutral (inherit)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border-2 border-green-500 bg-success/20 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-xs text-foreground-muted">Allow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border-2 border-red-500 bg-error/20 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <span className="text-xs text-foreground-muted">Deny</span>
          </div>
        </div>
      </div>
    </div>
  );
}
