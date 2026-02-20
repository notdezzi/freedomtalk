'use client';

import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MemberResponse, RoleResponse } from '@/lib/api-client';
import { ShieldAlert } from 'lucide-react';

interface MemberCardProps {
  member: MemberResponse;
  roles: RoleResponse[];
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Helper to convert color number to hex string
 */
function colorToHex(color: number | undefined): string | null {
  if (color === undefined || color === null || color === 0) return null;
  return '#' + color.toString(16).padStart(6, '0');
}

/**
 * Get role color from member's highest role with a color
 */
function getMemberColor(member: MemberResponse, roles: RoleResponse[]): string | null {
  // Get role IDs from member (handles both string[] and object[] formats)
  const memberRoleIds = member.roles.map(r => typeof r === 'string' ? r : r.id);

  // Get roles that the member has, sorted by position (highest first)
  const memberRoles = roles
    .filter(role => memberRoleIds.includes(role.id))
    .sort((a, b) => b.position - a.position);

  // Find first role with a color
  for (const role of memberRoles) {
    const hexColor = colorToHex(role.color);
    if (hexColor) return hexColor;
  }

  return null;
}

/**
 * Get top 3 roles for display
 */
function getTopRoles(member: MemberResponse, roles: RoleResponse[]): RoleResponse[] {
  // Get role IDs from member (handles both string[] and object[] formats)
  const memberRoleIds = member.roles.map(r => typeof r === 'string' ? r : r.id);

  return roles
    .filter(role => memberRoleIds.includes(role.id))
    .sort((a, b) => b.position - a.position)
    .slice(0, 3);
}

export function MemberCard({ member, roles, isSelected, onClick }: MemberCardProps) {
  const displayName = member.displayName || member.username;
  const memberColor = getMemberColor(member, roles);
  const topRoles = getTopRoles(member, roles);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
        'text-left transition-colors',
        isSelected
          ? 'bg-accent/20 text-foreground'
          : 'text-foreground-muted hover:bg-background-surface hover:text-foreground'
      )}
    >
      {/* Avatar with status */}
      <Avatar
        src={member.avatar ?? undefined}
        alt={displayName}
        size="md"
        status={member.isOnline ? (member.status as 'online' | 'idle' | 'dnd' | 'offline') : 'offline'}
        showStatus
      />

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'font-medium truncate',
              memberColor && 'text-[color:var(--member-color)]'
            )}
            style={memberColor ? { '--member-color': memberColor } as React.CSSProperties : undefined}
          >
            {displayName}
          </span>
          {member.isOwner && (
            <ShieldAlert className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
          )}
        </div>

        {/* Role badges */}
        {topRoles.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {topRoles.map(role => {
              const roleColor = colorToHex(role.color);
              return (
                <span
                  key={role.id}
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                    roleColor
                      ? 'bg-opacity-20 text-[color:var(--role-color)]'
                      : 'bg-background-surface text-foreground-subtle'
                  )}
                  style={roleColor ? {
                    '--role-color': roleColor,
                    backgroundColor: roleColor + '20'
                  } as React.CSSProperties : undefined}
                >
                  {role.name}
                </span>
              );
            })}
            {member.roles.length > 3 && (
              <span className="text-xs text-foreground-subtle">
                +{member.roles.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Online status indicator */}
      <div
        className={cn(
          'h-2 w-2 rounded-full flex-shrink-0',
          member.isOnline ? 'bg-green-500' : 'bg-gray-500'
        )}
        title={member.isOnline ? 'Online' : 'Offline'}
      />
    </button>
  );
}
