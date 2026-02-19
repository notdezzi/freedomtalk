'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useServerMembers, useKickMember, useBanMember } from '@/features/servers';
import { useServerRoles, useSetMemberRoles } from '@/features/roles';
import { useCan } from '@/hooks';
import { PERMISSION_FLAGS } from '@freedomtalk/shared';
import { MemberList, RoleAssignment } from '../member-editor';
import { toast } from '@/stores/toast-store';
import type { MemberResponse } from '@/lib/api-client';
import { UserX, ShieldAlert, Clock } from 'lucide-react';

interface MembersTabProps {
  serverId: string;
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
function getMemberColor(member: MemberResponse, roles: { id: string; color: number; position: number }[]): string | null {
  const memberRoles = roles
    .filter(role => member.roles.includes(role.id))
    .sort((a, b) => b.position - a.position);

  for (const role of memberRoles) {
    const hexColor = colorToHex(role.color);
    if (hexColor) return hexColor;
  }

  return null;
}

export function MembersTab({ serverId }: MembersTabProps) {
  const [selectedMember, setSelectedMember] = useState<MemberResponse | null>(null);

  // Queries
  const { data: members = [], isLoading: isLoadingMembers } = useServerMembers(serverId);
  const { data: roles = [], isLoading: isLoadingRoles } = useServerRoles(serverId);

  // Mutations
  const setMemberRoles = useSetMemberRoles(serverId);
  const kickMember = useKickMember(serverId);
  const banMember = useBanMember(serverId);

  // Permission checks
  const canManageRoles = useCan(serverId, PERMISSION_FLAGS.MANAGE_ROLES);
  const canKick = useCan(serverId, PERMISSION_FLAGS.KICK_MEMBERS);
  const canBan = useCan(serverId, PERMISSION_FLAGS.BAN_MEMBERS);
  const canTimeout = useCan(serverId, PERMISSION_FLAGS.TIMEOUT_MEMBERS);

  // Check if we can moderate (any moderation permission)
  const canModerate = canKick || canBan || canTimeout;

  const handleSelectMember = useCallback((member: MemberResponse) => {
    setSelectedMember(member);
  }, []);

  const handleRolesChange = useCallback((roleIds: string[]) => {
    if (!selectedMember) return;

    setMemberRoles.mutate(
      { userId: selectedMember.userId, roleIds },
      {
        onSuccess: () => {
          toast.success(`Updated roles for ${selectedMember.displayName || selectedMember.username}`);
        },
        onError: (error) => {
          toast.error('Failed to update roles. You may not have permission.');
          console.error('Role update error:', error);
        },
      }
    );
  }, [selectedMember, setMemberRoles]);

  const handleKick = useCallback(() => {
    if (!selectedMember || selectedMember.isOwner) return;

    const confirmed = window.confirm(
      `Are you sure you want to kick ${selectedMember.displayName || selectedMember.username}?`
    );
    if (!confirmed) return;

    kickMember.mutate(selectedMember.userId, {
      onSuccess: () => {
        toast.success(`${selectedMember.displayName || selectedMember.username} has been kicked`);
        setSelectedMember(null);
      },
      onError: (error) => {
        toast.error('Failed to kick member. You may not have permission.');
        console.error('Kick error:', error);
      },
    });
  }, [selectedMember, kickMember]);

  const handleBan = useCallback(() => {
    if (!selectedMember || selectedMember.isOwner) return;

    const reason = window.prompt(
      `Ban ${selectedMember.displayName || selectedMember.username}. Enter a reason (optional):`
    );
    if (reason === null) return; // User cancelled

    const confirmed = window.confirm(
      `Are you sure you want to BAN ${selectedMember.displayName || selectedMember.username}? They will not be able to rejoin.`
    );
    if (!confirmed) return;

    banMember.mutate(
      { userId: selectedMember.userId, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(`${selectedMember.displayName || selectedMember.username} has been banned`);
          setSelectedMember(null);
        },
        onError: (error) => {
          toast.error('Failed to ban member. You may not have permission.');
          console.error('Ban error:', error);
        },
      }
    );
  }, [selectedMember, banMember]);

  const isLoading = isLoadingMembers || isLoadingRoles;

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-xl font-semibold text-foreground mb-6">Members</h3>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Member list panel */}
        <div className="w-1/2 min-w-[280px] flex flex-col">
          <MemberList
            members={members}
            roles={roles}
            selectedMemberId={selectedMember?.id || null}
            onSelectMember={handleSelectMember}
            isLoading={isLoading}
          />
        </div>

        {/* Selected member details panel */}
        <div className="flex-1 min-w-[280px]">
          {selectedMember ? (
            <div className="h-full flex flex-col">
              {/* Member info header */}
              <div className="flex items-start gap-4 mb-6">
                <Avatar
                  src={selectedMember.avatar ?? undefined}
                  alt={selectedMember.displayName || selectedMember.username}
                  size="xl"
                  status={selectedMember.isOnline ? (selectedMember.status as 'online' | 'idle' | 'dnd' | 'offline') : 'offline'}
                  showStatus
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className="text-lg font-semibold truncate"
                      style={getMemberColor(selectedMember, roles)
                        ? { color: getMemberColor(selectedMember, roles) ?? undefined }
                        : undefined}
                    >
                      {selectedMember.displayName || selectedMember.username}
                    </h4>
                    {selectedMember.isOwner && (
                      <span title="Owner">
                        <ShieldAlert className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground-muted">
                    @{selectedMember.username}
                  </p>
                  {selectedMember.joinedAt && (
                    <p className="text-xs text-foreground-subtle mt-1">
                      Joined {formatDate(selectedMember.joinedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Role assignment */}
              {canManageRoles && (
                <div className="mb-6">
                  <RoleAssignment
                    roles={roles}
                    memberRoleIds={selectedMember.roles}
                    onChange={handleRolesChange}
                    disabled={selectedMember.isOwner || setMemberRoles.isPending}
                  />
                </div>
              )}

              {/* Moderation actions */}
              {canModerate && !selectedMember.isOwner && (
                <div className="mt-auto pt-4 border-t border-border">
                  <label className="text-xs font-semibold text-foreground-muted uppercase mb-3 block">
                    Moderation
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {canKick && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleKick}
                        disabled={kickMember.isPending}
                        className="text-error hover:bg-error/10"
                      >
                        <UserX className="h-4 w-4 mr-1.5" />
                        {kickMember.isPending ? 'Kicking...' : 'Kick'}
                      </Button>
                    )}
                    {canBan && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleBan}
                        disabled={banMember.isPending}
                      >
                        <ShieldAlert className="h-4 w-4 mr-1.5" />
                        {banMember.isPending ? 'Banning...' : 'Ban'}
                      </Button>
                    )}
                    {canTimeout && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        title="Timeout feature coming soon"
                      >
                        <Clock className="h-4 w-4 mr-1.5" />
                        Timeout
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Owner notice */}
              {selectedMember.isOwner && (
                <div className="mt-auto pt-4 border-t border-border">
                  <p className="text-xs text-foreground-subtle italic">
                    Server owners cannot be moderated or have their roles changed.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-foreground-subtle rounded-lg border border-dashed border-border">
              <div className="h-16 w-16 rounded-full bg-background-surface flex items-center justify-center mb-4">
                <svg
                  className="h-8 w-8 text-foreground-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium">No member selected</p>
              <p className="text-xs text-foreground-subtle mt-1">
                Select a member from the list to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
