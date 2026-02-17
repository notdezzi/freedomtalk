'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Crown, MoreVertical, UserX, Ban, Shield, Check, Loader2 } from 'lucide-react';
import { useMemberStore, ServerMember } from '@/stores/memberStore';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

interface ServerMembersTabProps {
  serverId: string;
  isOwner: boolean;
}

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
}

function intToHex(color: number): string {
  if (!color) return '#99aab5';
  return '#' + color.toString(16).padStart(6, '0');
}

export default function ServerMembersTab({ serverId, isOwner }: ServerMembersTabProps) {
  const { user } = useAuth();
  const { members, fetchMembers, updateMember, removeMember } = useMemberStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [roleMenu, setRoleMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMembers(serverId);

      // Fetch roles
      const response = await apiClient.getRoles(serverId);
      if (response.success && response.data) {
        const rolesArray = Array.isArray(response.data)
          ? response.data
          : (response.data as { roles?: Role[] }).roles || [];
        setRoles(rolesArray);
      }

      setLoading(false);
    };

    loadData();
  }, [serverId, fetchMembers]);

  const serverMembers = useMemo(() => {
    return members[serverId] || [];
  }, [members, serverId]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return serverMembers;
    const query = searchQuery.toLowerCase();
    return serverMembers.filter(
      (m) =>
        m.username.toLowerCase().includes(query) ||
        m.displayName?.toLowerCase().includes(query)
    );
  }, [serverMembers, searchQuery]);

  const handleKick = async (member: ServerMember) => {
    if (!confirm(`Kick ${member.displayName || member.username}?`)) return;

    setActionLoading(member.userId);
    const response = await apiClient.kickMember(serverId, member.userId);

    if (response.success) {
      removeMember(serverId, member.userId);
    }

    setActionLoading(null);
    setActionMenu(null);
  };

  const handleBan = async (member: ServerMember) => {
    if (!confirm(`Ban ${member.displayName || member.username}?`)) return;

    setActionLoading(member.userId);
    const response = await apiClient.banMember(serverId, member.userId);

    if (response.success) {
      removeMember(serverId, member.userId);
    }

    setActionLoading(null);
    setActionMenu(null);
  };

  const handleRoleChange = async (member: ServerMember, roleId: string) => {
    const currentRoles = member.roles || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter((r) => r !== roleId)
      : [...currentRoles, roleId];

    setActionLoading(member.userId);
    const response = await apiClient.setMemberRoles(serverId, member.userId, newRoles);

    if (response.success) {
      updateMember(serverId, member.userId, { roles: newRoles });
    }

    setActionLoading(null);
    setRoleMenu(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-10 pr-4 py-2 bg-background-surface rounded border border-border focus:border-accent focus:outline-none"
        />
      </div>

      {/* Members List */}
      <div className="space-y-1">
        {filteredMembers.map((member) => {
          const isSelf = member.userId === user?.id;
          const canManage = isOwner || (!member.isOwner && !isSelf);

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-background-surface group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden">
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-background">
                      {(member.displayName || member.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {member.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-background-elevated" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {member.isOwner && <Crown className="w-3 h-3 text-warning" />}
                  <span className="font-medium truncate">
                    {member.displayName || member.username}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                  <span>@{member.username}</span>
                  {member.roles.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="truncate">
                        {member.roles
                          .map((roleId) => roles.find((r) => r.id === roleId)?.name)
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              {canManage && (
                <div className="relative">
                  <button
                    onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                    className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {actionMenu === member.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-background-elevated rounded-lg border border-border shadow-lg z-10 py-1">
                      <button
                        onClick={() => handleKick(member)}
                        disabled={actionLoading === member.userId}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface disabled:opacity-50"
                      >
                        {actionLoading === member.userId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserX className="w-4 h-4" />
                        )}
                        Kick
                      </button>
                      <button
                        onClick={() => handleBan(member)}
                        disabled={actionLoading === member.userId}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 disabled:opacity-50"
                      >
                        <Ban className="w-4 h-4" />
                        Ban
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => {
                          setRoleMenu(roleMenu === member.id ? null : member.id);
                          setActionMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface"
                      >
                        <Shield className="w-4 h-4" />
                        Manage Roles
                      </button>
                    </div>
                  )}

                  {/* Role Menu */}
                  {roleMenu === member.id && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-background-elevated rounded-lg border border-border shadow-lg z-10 py-1">
                      <div className="px-3 py-2 text-xs font-semibold text-foreground-muted uppercase">
                        Assign Roles
                      </div>
                      {roles.map((role) => {
                        const hasRole = member.roles.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            onClick={() => handleRoleChange(member, role.id)}
                            disabled={actionLoading === member.userId}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-surface disabled:opacity-50"
                          >
                            <div
                              className="w-4 h-4 rounded border flex items-center justify-center"
                              style={{ borderColor: intToHex(role.color) }}
                            >
                              {hasRole && (
                                <Check
                                  className="w-3 h-3"
                                  style={{ color: intToHex(role.color) }}
                                />
                              )}
                            </div>
                            <span style={{ color: intToHex(role.color) }}>{role.name}</span>
                          </button>
                        );
                      })}
                      {roles.length === 0 && (
                        <div className="px-3 py-2 text-sm text-foreground-muted">
                          No roles available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-foreground-muted">
            No members found
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(actionMenu || roleMenu) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setActionMenu(null);
            setRoleMenu(null);
          }}
        />
      )}
    </div>
  );
}
