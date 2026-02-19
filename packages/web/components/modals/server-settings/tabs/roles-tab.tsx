'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { RoleList } from '../role-editor/role-list';
import { RoleForm } from '../role-editor/role-form';
import {
  useServerRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useUpdateRolePositions,
} from '@/features/roles';
import { Plus, Shield } from 'lucide-react';
import type { RoleResponse, UpdateRoleInput } from '@/lib/api-client';

interface RolesTabProps {
  serverId: string;
}

/**
 * Roles tab for server settings.
 *
 * Displays a two-column layout:
 * - Left: List of roles with drag-and-drop reordering
 * - Right: Edit panel for the selected role
 *
 * Features:
 * - Create new roles
 * - Edit role name, color, hoist, mentionable, permissions
 * - Delete roles (except @everyone)
 * - Drag-and-drop to reorder roles
 */
export function RolesTab({ serverId }: RolesTabProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();

  // React Query hooks
  const { data: roles = [], isLoading: isLoadingRoles } = useServerRoles(serverId);
  const createRole = useCreateRole(serverId);
  const updateRole = useUpdateRole(serverId);
  const deleteRole = useDeleteRole(serverId);
  const updateRolePositions = useUpdateRolePositions(serverId);

  // Find the selected role
  const selectedRole = roles.find(r => r.id === selectedRoleId);

  // Handle role selection
  const handleSelectRole = useCallback((roleId: string) => {
    setSelectedRoleId(roleId);
  }, []);

  // Handle create new role
  const handleCreateRole = useCallback(() => {
    createRole.mutate(
      {
        name: 'New Role',
        color: 0x99AAB5,
        hoist: false,
        mentionable: false,
      },
      {
        onSuccess: (response) => {
          // Select the newly created role
          if (response && 'id' in response) {
            setSelectedRoleId(response.id);
          }
        },
      }
    );
  }, [createRole]);

  // Handle role update
  const handleUpdateRole = useCallback(
    (roleId: string, data: UpdateRoleInput) => {
      updateRole.mutate(
        { roleId, data },
        {
          onSuccess: () => {
            // Optionally show a success message
          },
        }
      );
    },
    [updateRole]
  );

  // Handle role delete
  const handleDeleteRole = useCallback(
    (roleId: string) => {
      deleteRole.mutate(roleId, {
        onSuccess: () => {
          // Clear selection after delete
          setSelectedRoleId(undefined);
        },
      });
    },
    [deleteRole]
  );

  // Handle role reordering
  const handleReorderRoles = useCallback(
    (positions: { id: string; position: number }[]) => {
      updateRolePositions.mutate(positions);
    },
    [updateRolePositions]
  );

  // Handle cancel (deselect role)
  const handleCancel = useCallback(() => {
    setSelectedRoleId(undefined);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header with Create button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roles
          </h3>
          <p className="text-sm text-foreground-muted mt-1">
            Create and manage roles for your server members
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateRole}
          loading={createRole.isPending}
          disabled={isLoadingRoles}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Role list */}
        <div className="w-56 flex-shrink-0 flex flex-col bg-background-surface rounded-lg border border-border">
          <div className="px-3 py-2 border-b border-border">
            <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Roles
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <RoleList
              roles={roles}
              selectedRoleId={selectedRoleId}
              onSelectRole={handleSelectRole}
              onReorderRoles={handleReorderRoles}
              isLoading={isLoadingRoles}
            />
          </div>
        </div>

        {/* Right: Edit panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedRole ? (
            <div className="flex-1 bg-background-surface rounded-lg border border-border p-4 overflow-y-auto">
              <RoleForm
                role={selectedRole}
                onUpdate={handleUpdateRole}
                onDelete={handleDeleteRole}
                onCancel={handleCancel}
                isLoading={updateRole.isPending}
                isDeleting={deleteRole.isPending}
              />
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center bg-background-surface rounded-lg border border-border">
              <div className="text-center max-w-xs">
                <Shield className="h-12 w-12 mx-auto text-foreground-subtle mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  No Role Selected
                </h4>
                <p className="text-sm text-foreground-muted mb-4">
                  Select a role from the list to edit its settings, or create a new role to get started.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateRole}
                  loading={createRole.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {(createRole.isError || updateRole.isError || deleteRole.isError || updateRolePositions.isError) && (
        <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error">
            {createRole.error?.message ||
              updateRole.error?.message ||
              deleteRole.error?.message ||
              updateRolePositions.error?.message ||
              'An error occurred'}
          </p>
        </div>
      )}
    </div>
  );
}
