'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { PermissionEditor } from './permission-editor';
import { Trash2, Save, X } from 'lucide-react';
import type { RoleResponse, UpdateRoleInput } from '@/lib/api-client';

// Preset colors for role color picker
const PRESET_COLORS = [
  { name: 'Red', value: 0xED4245 },
  { name: 'Orange', value: 0xFAA61A },
  { name: 'Yellow', value: 0xFEE75C },
  { name: 'Green', value: 0x57F287 },
  { name: 'Teal', value: 0x3BA55D },
  { name: 'Cyan', value: 0x5865F2 },
  { name: 'Blue', value: 0x3498DB },
  { name: 'Purple', value: 0x9B59B6 },
  { name: 'Pink', value: 0xEB459E },
  { name: 'White', value: 0x99AAB5 },
];

export interface RoleFormProps {
  /** The role being edited */
  role: RoleResponse;
  /** Callback when role is updated */
  onUpdate: (roleId: string, data: UpdateRoleInput) => void;
  /** Callback when role is deleted */
  onDelete: (roleId: string) => void;
  /** Callback to cancel editing */
  onCancel: () => void;
  /** Whether a mutation is in progress */
  isLoading?: boolean;
  /** Whether delete is in progress */
  isDeleting?: boolean;
  /** Optional class name */
  className?: string;
}

/**
 * Convert integer color to hex string for display
 */
function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0').toUpperCase()}`;
}

/**
 * Convert hex string to integer color
 */
function hexToColor(hex: string): number {
  const cleanHex = hex.replace('#', '');
  return parseInt(cleanHex, 16);
}

/**
 * Role edit form component.
 *
 * Provides editing for role name, color, hoist, mentionable, and permissions.
 * For @everyone role, name is disabled and delete button is hidden.
 */
export function RoleForm({
  role,
  onUpdate,
  onDelete,
  onCancel,
  isLoading,
  isDeleting,
  className,
}: RoleFormProps) {
  const isEveryone = role.name === '@everyone';

  // Form state
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [hoist, setHoist] = useState(role.hoist);
  const [mentionable, setMentionable] = useState(role.mentionable);
  const [allowPermissions, setAllowPermissions] = useState<bigint>(
    BigInt(role.allowPermissions || '0')
  );
  const [denyPermissions, setDenyPermissions] = useState<bigint>(
    BigInt(role.denyPermissions || '0')
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Track if form has changes
  const hasChanges = useMemo(() => {
    return (
      name !== role.name ||
      color !== role.color ||
      hoist !== role.hoist ||
      mentionable !== role.mentionable ||
      allowPermissions.toString() !== role.allowPermissions ||
      denyPermissions.toString() !== role.denyPermissions
    );
  }, [name, color, hoist, mentionable, allowPermissions, denyPermissions, role]);

  // Reset form when role changes
  useEffect(() => {
    setName(role.name);
    setColor(role.color);
    setHoist(role.hoist);
    setMentionable(role.mentionable);
    setAllowPermissions(BigInt(role.allowPermissions || '0'));
    setDenyPermissions(BigInt(role.denyPermissions || '0'));
    setShowDeleteConfirm(false);
  }, [role]);

  const handleSave = () => {
    if (!name.trim()) return;

    onUpdate(role.id, {
      name: name.trim(),
      color,
      hoist,
      mentionable,
      allowPermissions,
      denyPermissions,
    });
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(role.id);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handlePermissionChange = (allow: bigint, deny: bigint) => {
    setAllowPermissions(allow);
    setDenyPermissions(deny);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Edit {isEveryone ? 'Default Permissions' : 'Role'}
        </h3>
        {!isEveryone && (
          <button
            onClick={onCancel}
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground-muted">
          Role Name
        </label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isEveryone || isLoading}
          placeholder="Enter role name"
        />
        {isEveryone && (
          <p className="text-xs text-foreground-subtle">
            The @everyone role name cannot be changed
          </p>
        )}
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground-muted">
          Role Color
        </label>
        <div className="flex items-center gap-3">
          {/* Color preview */}
          <div
            className="w-10 h-10 rounded-lg border border-border flex-shrink-0"
            style={{ backgroundColor: colorToHex(color) }}
          />

          {/* Preset colors */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                disabled={isLoading}
                className={cn(
                  'w-6 h-6 rounded-md transition-transform',
                  'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent/50',
                  color === c.value && 'ring-2 ring-white ring-offset-2 ring-offset-background'
                )}
                style={{ backgroundColor: colorToHex(c.value) }}
                title={c.name}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div className="relative">
            <input
              type="color"
              value={colorToHex(color)}
              onChange={e => setColor(hexToColor(e.target.value))}
              disabled={isLoading}
              className="w-6 h-6 rounded-md cursor-pointer opacity-0 absolute inset-0"
            />
            <div className="w-6 h-6 rounded-md border border-dashed border-border flex items-center justify-center text-foreground-subtle text-xs">
              +
            </div>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        {/* Hoist toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={cn(
              'w-10 h-6 rounded-full transition-colors relative',
              hoist ? 'bg-accent' : 'bg-background-surface'
            )}
            onClick={() => !isLoading && setHoist(!hoist)}
          >
            <div
              className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                hoist ? 'translate-x-5' : 'translate-x-1'
              )}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">
              Display separately
            </span>
            <p className="text-xs text-foreground-muted">
              Show members with this role in a separate category in the member list
            </p>
          </div>
        </label>

        {/* Mentionable toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={cn(
              'w-10 h-6 rounded-full transition-colors relative',
              mentionable ? 'bg-accent' : 'bg-background-surface'
            )}
            onClick={() => !isLoading && setMentionable(!mentionable)}
          >
            <div
              className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                mentionable ? 'translate-x-5' : 'translate-x-1'
              )}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">
              Allow anyone to @mention
            </span>
            <p className="text-xs text-foreground-muted">
              Allow anyone to mention this role using @role-name
            </p>
          </div>
        </label>
      </div>

      {/* Permissions Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
          Permissions
        </h4>
        <PermissionEditor
          allowPermissions={allowPermissions}
          denyPermissions={denyPermissions}
          onChange={handlePermissionChange}
          disabled={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {/* Delete button - hidden for @everyone */}
        {!isEveryone && (
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  loading={isDeleting}
                >
                  Confirm Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="text-error hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Role
              </Button>
            )}
          </div>
        )}

        {/* Save/Cancel buttons */}
        <div className={cn('flex items-center gap-2', isEveryone && 'ml-auto')}>
          {!isEveryone && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !hasChanges}
            loading={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
