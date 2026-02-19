'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { PermissionEditor } from '../role-editor/permission-editor';
import {
  useChannelOverwrites,
  useSetChannelOverwrite,
  useDeleteChannelOverwrite,
} from '@/features/permissions';
import { useServerRoles } from '@/features/roles';
import { useServerMembers } from '@/features/servers';
import { toast } from '@/stores/toast-store';
import type {
  ChannelResponse,
  ChannelOverwriteResponse,
  RoleResponse,
  MemberResponse,
} from '@/lib/api-client';
import {
  Shield,
  User,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Hash,
  Volume2,
} from 'lucide-react';

export interface OverwriteEditorProps {
  /** The channel being edited */
  channel: ChannelResponse;
  /** Server ID */
  serverId: string;
  /** Whether the user has permission to manage channels */
  canManageChannels: boolean;
}

/**
 * Helper to convert color number to hex string
 */
function colorToHex(color: number | undefined): string | null {
  if (color === undefined || color === null || color === 0) return null;
  return '#' + color.toString(16).padStart(6, '0');
}

/**
 * Overwrite editor component for managing channel permission overwrites.
 *
 * Displays a list of current overwrites (role and member) and allows
 * adding, editing, and deleting overwrites.
 */
export function OverwriteEditor({
  channel,
  serverId,
  canManageChannels,
}: OverwriteEditorProps) {
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'role' | 'member'>('role');

  // Queries
  const { data: overwrites = [], isLoading: isLoadingOverwrites } =
    useChannelOverwrites(channel.id);
  const { data: roles = [], isLoading: isLoadingRoles } = useServerRoles(serverId);
  const { data: members = [], isLoading: isLoadingMembers } =
    useServerMembers(serverId);

  // Mutations
  const setOverwrite = useSetChannelOverwrite(channel.id);
  const deleteOverwrite = useDeleteChannelOverwrite(channel.id);

  // Get the overwrite being edited
  const editingOverwrite = useMemo(() => {
    if (!editingTargetId) return null;
    return overwrites.find((o) => o.targetId === editingTargetId) || null;
  }, [overwrites, editingTargetId]);

  // Get role or member info for display
  const getRoleInfo = useCallback(
    (roleId: string): RoleResponse | undefined => {
      return roles.find((r) => r.id === roleId);
    },
    [roles]
  );

  const getMemberInfo = useCallback(
    (userId: string): MemberResponse | undefined => {
      return members.find((m) => m.userId === userId);
    },
    [members]
  );

  // Handle edit overwrite
  const handleEditOverwrite = useCallback((targetId: string) => {
    setEditingTargetId(targetId);
  }, []);

  // Handle save overwrite
  const handleSaveOverwrite = useCallback(
    (allow: bigint, deny: bigint) => {
      if (!editingTargetId) return;

      const existingOverwrite = overwrites.find(
        (o) => o.targetId === editingTargetId
      );

      setOverwrite.mutate(
        {
          targetId: editingTargetId,
          allow,
          deny,
          type: existingOverwrite?.targetType || 'role',
        },
        {
          onSuccess: () => {
            toast.success('Permission overwrite saved');
            setEditingTargetId(null);
          },
          onError: (error) => {
            toast.error('Failed to save overwrite');
            console.error('Save overwrite error:', error);
          },
        }
      );
    },
    [editingTargetId, overwrites, setOverwrite]
  );

  // Handle delete overwrite
  const handleDeleteOverwrite = useCallback(
    (targetId: string) => {
      const overwrite = overwrites.find((o) => o.targetId === targetId);
      if (!overwrite) return;

      const isEveryone = overwrite.targetId === serverId;
      const confirmMessage = isEveryone
        ? 'Reset @everyone permissions to neutral?'
        : `Delete permission overwrite for ${
            overwrite.targetType === 'role'
              ? getRoleInfo(overwrite.targetId)?.name || 'role'
              : getMemberInfo(overwrite.targetId)?.username || 'member'
          }?`;

      if (!window.confirm(confirmMessage)) return;

      if (isEveryone) {
        // For @everyone, reset to neutral (all zeros) instead of deleting
        setOverwrite.mutate(
          {
            targetId,
            allow: BigInt(0),
            deny: BigInt(0),
            type: 'role',
          },
          {
            onSuccess: () => {
              toast.success('@everyone permissions reset to neutral');
            },
            onError: (error) => {
              toast.error('Failed to reset @everyone permissions');
              console.error('Reset @everyone error:', error);
            },
          }
        );
      } else {
        deleteOverwrite.mutate(targetId, {
          onSuccess: () => {
            toast.success('Permission overwrite deleted');
            if (editingTargetId === targetId) {
              setEditingTargetId(null);
            }
          },
          onError: (error) => {
            toast.error('Failed to delete overwrite');
            console.error('Delete overwrite error:', error);
          },
        });
      }
    },
    [
      overwrites,
      serverId,
      setOverwrite,
      deleteOverwrite,
      editingTargetId,
      getRoleInfo,
      getMemberInfo,
    ]
  );

  // Handle cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingTargetId(null);
  }, []);

  // Handle add overwrite
  const handleAddOverwrite = useCallback(
    (targetId: string, type: 'role' | 'member') => {
      setOverwrite.mutate(
        {
          targetId,
          allow: BigInt(0),
          deny: BigInt(0),
          type,
        },
        {
          onSuccess: () => {
            toast.success('Permission overwrite created');
            setShowAddDialog(false);
            setEditingTargetId(targetId);
          },
          onError: (error) => {
            toast.error('Failed to create overwrite');
            console.error('Create overwrite error:', error);
          },
        }
      );
    },
    [setOverwrite]
  );

  const isLoading = isLoadingOverwrites || isLoadingRoles || isLoadingMembers;

  // Channel icon
  const ChannelIcon = channel.type === 'voice' ? Volume2 : Hash;

  return (
    <div className="h-full flex flex-col">
      {/* Channel header */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
        <ChannelIcon className="h-5 w-5 text-foreground-muted" />
        <h4 className="text-lg font-semibold text-foreground">
          {channel.name}
        </h4>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Overwrites list section */}
          <div className="mb-6">
            <h5 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Roles/Members with Overwrites
            </h5>

            {overwrites.length === 0 ? (
              <div className="text-sm text-foreground-subtle italic p-4 bg-background-elevated rounded-lg">
                No permission overwrites set for this channel.
              </div>
            ) : (
              <div className="space-y-1 bg-background-elevated rounded-lg overflow-hidden">
                {overwrites.map((overwrite) => {
                  const isEveryone = overwrite.targetId === serverId;
                  const role = isEveryone
                    ? ({ id: serverId, name: '@everyone', color: 0 } as RoleResponse)
                    : overwrite.targetType === 'role'
                    ? getRoleInfo(overwrite.targetId)
                    : undefined;
                  const member =
                    overwrite.targetType === 'member'
                      ? getMemberInfo(overwrite.targetId)
                      : undefined;

                  const displayName = isEveryone
                    ? '@everyone'
                    : overwrite.targetType === 'role'
                    ? role?.name || 'Unknown Role'
                    : member?.displayName || member?.username || 'Unknown Member';

                  const colorHex =
                    isEveryone || overwrite.targetType === 'role'
                      ? colorToHex(role?.color)
                      : null;

                  return (
                    <div
                      key={`${overwrite.targetType}-${overwrite.targetId}`}
                      className={cn(
                        'flex items-center justify-between px-3 py-2',
                        'border-b border-border last:border-b-0',
                        editingTargetId === overwrite.targetId &&
                          'bg-primary/10'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {overwrite.targetType === 'role' || isEveryone ? (
                          <Shield
                            className="h-4 w-4 flex-shrink-0"
                            style={
                              colorHex ? { color: colorHex } : undefined
                            }
                          />
                        ) : (
                          <User className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span
                          className="truncate"
                          style={
                            colorHex ? { color: colorHex } : undefined
                          }
                        >
                          {displayName}
                        </span>
                        {overwrite.targetType === 'member' && (
                          <span className="text-xs text-foreground-subtle">
                            (member)
                          </span>
                        )}
                      </div>

                      {canManageChannels && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleEditOverwrite(overwrite.targetId)
                            }
                            className="h-7 px-2"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteOverwrite(overwrite.targetId)
                            }
                            className="h-7 px-2 text-error hover:bg-error/10"
                            disabled={deleteOverwrite.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add overwrite buttons */}
            {canManageChannels && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAddDialogType('role');
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Role
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAddDialogType('member');
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Member
                </Button>
              </div>
            )}
          </div>

          {/* Permission editor section */}
          {editingTargetId && editingOverwrite && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                  Permission Overwrite
                </h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-7 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 text-sm text-foreground-muted">
                For:{' '}
                <span className="text-foreground font-medium">
                  {editingOverwrite.targetId === serverId
                    ? '@everyone'
                    : editingOverwrite.targetType === 'role'
                    ? getRoleInfo(editingOverwrite.targetId)?.name ||
                      'Unknown Role'
                    : getMemberInfo(editingOverwrite.targetId)?.displayName ||
                      getMemberInfo(editingOverwrite.targetId)?.username ||
                      'Unknown Member'}
                </span>
              </div>

              <PermissionEditor
                allowPermissions={BigInt(editingOverwrite.allowPermissions)}
                denyPermissions={BigInt(editingOverwrite.denyPermissions)}
                onChange={handleSaveOverwrite}
                disabled={!canManageChannels || setOverwrite.isPending}
              />

              {canManageChannels && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={setOverwrite.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add overwrite dialog */}
      {showAddDialog && (
        <AddOverwriteDialog
          type={addDialogType}
          serverId={serverId}
          existingTargetIds={overwrites.map((o) => o.targetId)}
          roles={roles}
          members={members}
          onSelect={handleAddOverwrite}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

interface AddOverwriteDialogProps {
  type: 'role' | 'member';
  serverId: string;
  existingTargetIds: string[];
  roles: RoleResponse[];
  members: MemberResponse[];
  onSelect: (targetId: string, type: 'role' | 'member') => void;
  onClose: () => void;
}

function AddOverwriteDialog({
  type,
  serverId,
  existingTargetIds,
  roles,
  members,
  onSelect,
  onClose,
}: AddOverwriteDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out already added targets
  const availableRoles = roles.filter(
    (r) => !existingTargetIds.includes(r.id)
  );
  const availableMembers = members.filter(
    (m) => !existingTargetIds.includes(m.userId)
  );

  // Filter by search query
  const filteredRoles = availableRoles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredMembers = availableMembers.filter(
    (m) =>
      m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const items = type === 'role' ? filteredRoles : filteredMembers;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-surface border border-border rounded-lg w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-lg font-semibold text-foreground">
            Add {type === 'role' ? 'Role' : 'Member'} Overwrite
          </h4>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <input
              type="text"
              placeholder={`Search ${type}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-md',
                'bg-background-elevated border border-border',
                'text-foreground placeholder:text-foreground-subtle',
                'focus:outline-none focus:ring-2 focus:ring-primary/50'
              )}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-64 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="text-center py-8 text-foreground-subtle">
              {searchQuery
                ? `No ${type}s found matching "${searchQuery}"`
                : `All ${type}s already have overwrites`}
            </div>
          ) : (
            <div className="space-y-1">
              {type === 'role'
                ? filteredRoles.map((role) => {
                    const colorHex = colorToHex(role.color);
                    return (
                      <button
                        key={role.id}
                        onClick={() => onSelect(role.id, 'role')}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md',
                          'text-left text-sm transition-colors',
                          'hover:bg-primary/10 hover:text-primary'
                        )}
                      >
                        <Shield
                          className="h-4 w-4 flex-shrink-0"
                          style={colorHex ? { color: colorHex } : undefined}
                        />
                        <span
                          className="truncate"
                          style={colorHex ? { color: colorHex } : undefined}
                        >
                          {role.name}
                        </span>
                      </button>
                    );
                  })
                : filteredMembers.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => onSelect(member.userId, 'member')}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md',
                        'text-left text-sm transition-colors',
                        'hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      <User className="h-4 w-4 flex-shrink-0 text-foreground-muted" />
                      <span className="truncate">
                        {member.displayName || member.username}
                      </span>
                      {member.displayName && (
                        <span className="text-xs text-foreground-subtle">
                          @{member.username}
                        </span>
                      )}
                    </button>
                  ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
