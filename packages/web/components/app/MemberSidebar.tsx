'use client';

import { useMemo } from 'react';
import { Crown } from 'lucide-react';
import { useServerStore } from '@/stores/serverStore';
import { useMemberStore, ServerMember, UserStatus } from '@/stores/memberStore';
import { useUIStore } from '@/stores/uiStore';

function getStatusColor(status: UserStatus): string {
  switch (status) {
    case 'online':
      return 'bg-success';
    case 'idle':
      return 'bg-warning';
    case 'dnd':
      return 'bg-error';
    default:
      return 'bg-foreground-subtle';
  }
}

function getStatusText(status: UserStatus): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'idle':
      return 'Idle';
    case 'dnd':
      return 'Do Not Disturb';
    default:
      return 'Offline';
  }
}

function MemberItem({
  member,
  onClick,
}: {
  member: ServerMember;
  onClick: () => void;
}) {
  // Use displayName, username, or fallback to 'Unknown'
  const displayName = member.displayName || member.username || 'Unknown';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-background-surface transition-colors group"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center overflow-hidden">
          {member.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-background">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {/* Status indicator */}
        {member.status !== 'offline' && (
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-elevated ${getStatusColor(
              member.status
            )}`}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1">
          {member.isOwner && <Crown className="w-3 h-3 text-warning flex-shrink-0" />}
          <span
            className={`text-sm truncate ${
              member.status === 'offline' ? 'text-foreground-subtle' : 'text-foreground'
            }`}
          >
            {displayName}
          </span>
        </div>
        {member.customStatus && (
          <p className="text-xs text-foreground-subtle truncate">{member.customStatus}</p>
        )}
      </div>
    </button>
  );
}

function RoleGroup({
  roleName,
  members,
  onMemberClick,
}: {
  roleName: string;
  members: ServerMember[];
  onMemberClick: (member: ServerMember) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="px-2 mb-1 text-xs font-semibold text-foreground-muted uppercase tracking-wide">
        {roleName} — {members.length}
      </h3>
      <div className="space-y-0.5">
        {members.map((member) => (
          <MemberItem key={member.id} member={member} onClick={() => onMemberClick(member)} />
        ))}
      </div>
    </div>
  );
}

export default function MemberSidebar() {
  const { currentServerId } = useServerStore();
  const { getMembersByServer } = useMemberStore();
  const { openModal, isMemberSidebarOpen } = useUIStore();

  const members = useMemo(() => {
    if (!currentServerId) return [];
    return getMembersByServer(currentServerId);
  }, [currentServerId, getMembersByServer]);

  const handleMemberClick = (member: ServerMember) => {
    openModal('user-profile', { userId: member.userId, member });
  };

  if (!isMemberSidebarOpen || !currentServerId) return null;

  // Separate members by role and online status
  const owner = members.filter((m) => m.isOwner);
  const admins = members.filter((m) => m.roles.includes('admin') && !m.isOwner);
  const onlineMembers = members.filter(
    (m) => m.isOnline && !m.isOwner && !m.roles.includes('admin')
  );
  const offlineMembers = members.filter((m) => !m.isOnline && !m.isOwner && !m.roles.includes('admin'));

  return (
    <aside
      className="flex flex-col bg-background-elevated border-l border-border overflow-hidden"
      aria-label="Members"
    >
      <div className="flex-1 overflow-y-auto p-3">
        {/* Owner */}
        {owner.length > 0 && (
          <RoleGroup roleName="Owner" members={owner} onMemberClick={handleMemberClick} />
        )}

        {/* Admins */}
        {admins.length > 0 && (
          <RoleGroup roleName="Admins" members={admins} onMemberClick={handleMemberClick} />
        )}

        {/* Online members */}
        <RoleGroup roleName="Online" members={onlineMembers} onMemberClick={handleMemberClick} />

        {/* Offline members */}
        {offlineMembers.length > 0 && (
          <RoleGroup roleName="Offline" members={offlineMembers} onMemberClick={handleMemberClick} />
        )}
      </div>
    </aside>
  );
}
