'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Loader2, GripVertical } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ServerRolesTabProps {
  serverId: string;
  isOwner: boolean;
}

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
}

const PERMISSIONS = [
  { name: 'Administrator', value: BigInt(8) },
  { name: 'Manage Server', value: BigInt(16) },
  { name: 'Manage Roles', value: BigInt(268435456) },
  { name: 'Manage Channels', value: BigInt(32) },
  { name: 'Kick Members', value: BigInt(2) },
  { name: 'Ban Members', value: BigInt(4) },
  { name: 'Create Invite', value: BigInt(1) },
  { name: 'Change Nickname', value: BigInt(67108864) },
  { name: 'Manage Nicknames', value: BigInt(134217728) },
  { name: 'Manage Messages', value: BigInt(8192) },
  { name: 'Send Messages', value: BigInt(2048) },
  { name: 'Embed Links', value: BigInt(16384) },
  { name: 'Attach Files', value: BigInt(32768) },
  { name: 'Read Message History', value: BigInt(65536) },
  { name: 'Mention Everyone', value: BigInt(131072) },
  { name: 'Connect Voice', value: BigInt(1048576) },
  { name: 'Speak', value: BigInt(2097152) },
  { name: 'Mute Members', value: BigInt(4194304) },
  { name: 'Deafen Members', value: BigInt(8388608) },
  { name: 'Move Members', value: BigInt(16777216) },
];

const PRESET_COLORS = [
  0x99aab5, // Grey
  0x1abc9c, // Teal
  0x2ecc71, // Green
  0x3498db, // Blue
  0x9b59b6, // Purple
  0xe91e63, // Pink
  0xf1c40f, // Yellow
  0xe67e22, // Orange
  0xe74c3c, // Red
  0x7289da, // Blurple
];

function intToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export default function ServerRolesTab({ serverId, isOwner }: ServerRolesTabProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Edit state
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#99aab5');
  const [editHoist, setEditHoist] = useState(false);
  const [editMentionable, setEditMentionable] = useState(false);
  const [editPermissions, setEditPermissions] = useState<bigint>(BigInt(0));

  useEffect(() => {
    loadRoles();
  }, [serverId]);

  const loadRoles = async () => {
    setLoading(true);
    const response = await apiClient.getRoles(serverId);
    if (response.success && response.data) {
      const rolesArray = Array.isArray(response.data)
        ? response.data
        : (response.data as { roles?: Role[] }).roles || [];
      setRoles(rolesArray.sort((a: Role, b: Role) => b.position - a.position));
    }
    setLoading(false);
  };

  const startEdit = (role: Role) => {
    setEditingRole(role.id);
    setEditName(role.name);
    setEditColor(intToHex(role.color));
    setEditHoist(role.hoist);
    setEditMentionable(role.mentionable);
    setEditPermissions(BigInt(role.permissions));
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setEditName('');
    setEditColor('#99aab5');
    setEditHoist(false);
    setEditMentionable(false);
    setEditPermissions(BigInt(0));
  };

  const saveEdit = async () => {
    if (!editingRole || !editName.trim()) return;

    setSaving(true);
    const response = await apiClient.updateRole(serverId, editingRole, {
      name: editName,
      color: hexToInt(editColor),
      hoist: editHoist,
      mentionable: editMentionable,
      permissions: editPermissions.toString(),
    });

    if (response.success) {
      setRoles((prev) =>
        prev
          .map((r) =>
            r.id === editingRole
              ? {
                  ...r,
                  name: editName,
                  color: hexToInt(editColor),
                  hoist: editHoist,
                  mentionable: editMentionable,
                  permissions: editPermissions.toString(),
                }
              : r
          )
          .sort((a, b) => b.position - a.position)
      );
      cancelEdit();
    }

    setSaving(false);
  };

  const createRole = async () => {
    if (!newRoleName.trim() || !isOwner) return;

    setSaving(true);
    const response = await apiClient.createRole(serverId, { name: newRoleName });

    if (response.success && response.data) {
      const newRole = response.data as unknown as Role;
      setRoles((prev) => [...prev, newRole]);
      setNewRoleName('');
      setCreating(false);
    }

    setSaving(false);
  };

  const deleteRole = async (roleId: string) => {
    if (!isOwner) return;
    const role = roles.find((r) => r.id === roleId);
    if (!confirm(`Delete role "${role?.name}"?`)) return;

    setSaving(true);
    const response = await apiClient.deleteRole(serverId, roleId);

    if (response.success) {
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    }

    setSaving(false);
  };

  const togglePermission = (perm: bigint) => {
    setEditPermissions((prev) => (prev & perm ? prev & ~perm : prev | perm));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Server Roles</h4>
          <p className="text-sm text-foreground-muted mt-1">
            Create and manage roles for this server
          </p>
        </div>
        {isOwner && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 bg-accent text-background rounded text-sm font-medium hover:bg-accent-hover transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      {/* Create Role Form */}
      {creating && (
        <div className="p-4 bg-background-surface rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Role name"
              className="flex-1 px-3 py-2 bg-background rounded border border-border focus:border-accent focus:outline-none"
              autoFocus
            />
            <button
              onClick={createRole}
              disabled={!newRoleName.trim() || saving}
              className="px-3 py-2 bg-accent text-background rounded font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewRoleName('');
              }}
              className="px-3 py-2 bg-background-surface text-foreground rounded font-medium hover:bg-background-surface/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-background-surface rounded-lg border border-border overflow-hidden"
          >
            {editingRole === role.id ? (
              // Edit Mode
              <div className="p-4 space-y-4">
                {/* Name and Color */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Role Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-background rounded border border-border focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditColor(intToHex(color))}
                            className={`w-6 h-6 rounded ${intToHex(color) === editColor ? 'ring-2 ring-accent' : ''}`}
                            style={{ backgroundColor: intToHex(color) }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHoist}
                      onChange={(e) => setEditHoist(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm">Display separately</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editMentionable}
                      onChange={(e) => setEditMentionable(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm">Allow mentions</span>
                  </label>
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-2">
                    Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PERMISSIONS.map((perm) => (
                      <label
                        key={perm.name}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(editPermissions & perm.value) !== BigInt(0)}
                          onChange={() => togglePermission(perm.value)}
                          className="w-4 h-4 rounded border-border"
                        />
                        {perm.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 bg-background-surface text-foreground rounded font-medium hover:bg-background-surface/80 transition-colors flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={!editName.trim() || saving}
                    className="px-3 py-1.5 bg-accent text-background rounded font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-center gap-3 p-4">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: intToHex(role.color) }}
                />
                <span className="font-medium flex-1" style={{ color: intToHex(role.color) }}>
                  {role.name}
                </span>
                {role.hoist && (
                  <span className="text-xs px-2 py-0.5 bg-background rounded text-foreground-muted">
                    Hoisted
                  </span>
                )}
                {role.mentionable && (
                  <span className="text-xs px-2 py-0.5 bg-background rounded text-foreground-muted">
                    Mentionable
                  </span>
                )}
                {role.name !== '@everyone' && isOwner && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(role)}
                      className="p-1.5 rounded hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="p-1.5 rounded hover:bg-error/10 text-foreground-muted hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {roles.length === 0 && (
          <div className="text-center py-8 text-foreground-muted">
            No roles created yet
          </div>
        )}
      </div>
    </div>
  );
}
