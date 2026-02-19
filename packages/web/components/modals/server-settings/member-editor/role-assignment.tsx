'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { RoleResponse } from '@/lib/api-client';
import { Check, Lock } from 'lucide-react';

interface RoleAssignmentProps {
  roles: RoleResponse[];
  memberRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
}

/**
 * Helper to convert color number to hex string
 */
function colorToHex(color: number | undefined): string | null {
  if (color === undefined || color === null || color === 0) return null;
  return '#' + color.toString(16).padStart(6, '0');
}

export function RoleAssignment({ roles, memberRoleIds, onChange, disabled }: RoleAssignmentProps) {
  // Local state for optimistic updates
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(memberRoleIds));

  // Sync with external state
  useEffect(() => {
    setSelectedRoles(new Set(memberRoleIds));
  }, [memberRoleIds]);

  // Find @everyone role (usually the lowest position or named @everyone)
  const everyoneRole = roles.find(r => r.name === '@everyone' || r.name.toLowerCase() === 'everyone');

  // Sort roles by position (highest first)
  const sortedRoles = [...roles].sort((a, b) => b.position - a.position);

  const handleToggle = (roleId: string) => {
    // @everyone role cannot be toggled
    if (roleId === everyoneRole?.id) return;
    if (disabled) return;

    const newSelected = new Set(selectedRoles);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoles(newSelected);
    onChange(Array.from(newSelected));
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
        Roles
      </label>

      <div className="space-y-0.5 max-h-60 overflow-y-auto rounded-lg bg-background-surface border border-border">
        {sortedRoles.map(role => {
          const roleColor = colorToHex(role.color);
          const isEveryone = role.id === everyoneRole?.id;
          const isSelected = selectedRoles.has(role.id);

          return (
            <button
              key={role.id}
              onClick={() => handleToggle(role.id)}
              disabled={disabled || isEveryone}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left',
                'transition-colors',
                isEveryone
                  ? 'cursor-not-allowed opacity-60'
                  : disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-background-elevated cursor-pointer'
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                  'transition-colors',
                  isSelected
                    ? 'bg-accent border-accent'
                    : 'border-border bg-transparent'
                )}
              >
                {isSelected && (
                  <Check className="h-3 w-3 text-background" />
                )}
              </div>

              {/* Role color indicator */}
              <div
                className={cn(
                  'h-3 w-3 rounded-full flex-shrink-0',
                  roleColor ? '' : 'bg-background-elevated'
                )}
                style={roleColor ? { backgroundColor: roleColor } : undefined}
              />

              {/* Role name */}
              <span
                className={cn(
                  'flex-1 truncate text-sm',
                  roleColor && 'font-medium'
                )}
                style={roleColor ? { color: roleColor } : undefined}
              >
                {role.name}
              </span>

              {/* Lock icon for @everyone */}
              {isEveryone && (
                <Lock className="h-3.5 w-3.5 text-foreground-subtle" />
              )}
            </button>
          );
        })}

        {roles.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-foreground-subtle">
            No roles available
          </div>
        )}
      </div>

      <p className="text-xs text-foreground-subtle mt-2">
        @everyone is the default role and cannot be removed
      </p>
    </div>
  );
}
