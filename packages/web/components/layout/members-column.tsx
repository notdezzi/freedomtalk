'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { useServerMembers, useKickMember, useBanMember } from '@/features/servers';
import { useAuth } from '@/hooks/use-auth';
import { Users, X, UserX, ShieldAlert, MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { ContextMenu, type ContextMenuItem } from '@/components/common/context-menu';
import { toast } from '@/stores/toast-store';
import type { MemberResponse } from '@/lib/api-client';

interface MembersColumnProps {
  serverId?: string;
}

export function MembersColumn({ serverId }: MembersColumnProps) {
  const isOpen = useUIStore((s) => s.isMembersSidebarOpen);
  const toggle = useUIStore((s) => s.toggleMembersSidebar);
  const openModal = useUIStore((s) => s.openModal);

  const { data: members = [], isLoading } = useServerMembers(serverId);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    member: MemberResponse | null;
  }>({ open: false, x: 0, y: 0, member: null });

  const handleContextMenu = useCallback((e: React.MouseEvent, member: MemberResponse) => {
    e.preventDefault();
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, member });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  const handleUserClick = useCallback((userId: string) => {
    openModal('user-profile', { userId, serverId });
  }, [openModal, serverId]);

  if (!serverId) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className={cn(
          'w-12 bg-background-elevated border-l border-border',
          'flex flex-col items-center justify-start pt-4',
          'text-foreground-muted hover:text-foreground transition-colors'
        )}
        aria-label="Show members"
      >
        <Users className="h-5 w-5" />
      </button>
    );
  }

  const onlineMembers = members.filter((m) => m.isOnline);
  const offlineMembers = members.filter((m) => !m.isOnline);

  return (
    <>
      <aside
        className={cn(
          'flex w-[25%] min-w-[180px] max-w-[280px] flex-col',
          'bg-background-elevated border-l border-border'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Members</h2>
          <button
            onClick={toggle}
            className="rounded p-1 text-foreground-muted hover:bg-background-surface hover:text-foreground"
            aria-label="Hide members"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-foreground-subtle">
              Loading members...
            </div>
          ) : (
            <>
              {/* Online */}
              <div className="mb-4">
                <h3 className="px-2 py-1 text-xs font-semibold text-foreground-subtle uppercase">
                  Online — {onlineMembers.length}
                </h3>
                {onlineMembers.map((member) => (
                  <MemberItem
                    key={member.id}
                    member={member}
                    serverId={serverId}
                    onContextMenu={handleContextMenu}
                    onUserClick={handleUserClick}
                  />
                ))}
              </div>

              {/* Offline */}
              {offlineMembers.length > 0 && (
                <div>
                  <h3 className="px-2 py-1 text-xs font-semibold text-foreground-subtle uppercase">
                    Offline — {offlineMembers.length}
                  </h3>
                  {offlineMembers.map((member) => (
                    <MemberItem
                      key={member.id}
                      member={member}
                      serverId={serverId}
                      onContextMenu={handleContextMenu}
                      onUserClick={handleUserClick}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Context Menu */}
      <MemberContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        member={contextMenu.member}
        serverId={serverId}
        onClose={closeContextMenu}
      />
    </>
  );
}

function MemberItem({
  member,
  serverId,
  onContextMenu,
  onUserClick,
}: {
  member: MemberResponse;
  serverId: string;
  onContextMenu: (e: React.MouseEvent, member: MemberResponse) => void;
  onUserClick: (userId: string) => void;
}) {
  return (
    <button
      onClick={() => onUserClick(member.userId)}
      onContextMenu={(e) => onContextMenu(e, member)}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5',
        'text-foreground-muted hover:bg-background-surface hover:text-foreground',
        !member.isOnline && 'opacity-50'
      )}
    >
      <Avatar
        src={member.avatar ?? undefined}
        alt={member.displayName || member.username}
        size="sm"
        status={member.status as 'online' | 'idle' | 'dnd' | 'offline' | undefined}
        showStatus
      />
      <span className="truncate text-sm">
        {member.displayName || member.username}
      </span>
      {member.isOwner && (
        <span title="Owner">
          <ShieldAlert className="h-3 w-3 text-yellow-500 ml-auto" />
        </span>
      )}
    </button>
  );
}

function MemberContextMenu({
  open,
  x,
  y,
  member,
  serverId,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  member: MemberResponse | null;
  serverId: string;
  onClose: () => void;
}) {
  const { user: currentUser } = useAuth();
  const kickMember = useKickMember(serverId);
  const banMember = useBanMember(serverId);

  if (!member) return null;

  const isSelf = currentUser?.id === member.userId;
  const isOwner = member.isOwner;

  const handleKick = () => {
    if (isSelf || isOwner) return;

    const confirmed = window.confirm(
      `Are you sure you want to kick ${member.displayName || member.username}?`
    );
    if (!confirmed) return;

    kickMember.mutate(member.userId, {
      onSuccess: () => {
        toast.success(`${member.displayName || member.username} has been kicked`);
      },
      onError: (error) => {
        toast.error('Failed to kick member. You may not have permission.');
        console.error('Kick error:', error);
      },
    });
  };

  const handleBan = () => {
    if (isSelf || isOwner) return;

    const reason = window.prompt(
      `Ban ${member.displayName || member.username}. Enter a reason (optional):`
    );
    // User cancelled
    if (reason === null) return;

    const confirmed = window.confirm(
      `Are you sure you want to BAN ${member.displayName || member.username}? They will not be able to rejoin.`
    );
    if (!confirmed) return;

    banMember.mutate(
      { userId: member.userId, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(`${member.displayName || member.username} has been banned`);
        },
        onError: (error) => {
          toast.error('Failed to ban member. You may not have permission.');
          console.error('Ban error:', error);
        },
      }
    );
  };

  const handleMessage = () => {
    // TODO: Navigate to DM channel
    toast.info('Direct messages coming soon!');
  };

  const items: ContextMenuItem[] = [
    {
      id: 'profile',
      label: 'View Profile',
      icon: <Users className="h-4 w-4" />,
      onClick: () => toast.info('Profile view coming soon!'),
    },
    {
      id: 'message',
      label: 'Message',
      icon: <MessageCircle className="h-4 w-4" />,
      onClick: handleMessage,
    },
    { id: 'separator-1', label: '', separator: true },
  ];

  // Only show kick/ban options for other users (not self, not owner)
  if (!isSelf && !isOwner) {
    items.push(
      {
        id: 'kick',
        label: 'Kick',
        icon: <UserX className="h-4 w-4" />,
        danger: true,
        onClick: handleKick,
      },
      {
        id: 'ban',
        label: 'Ban',
        icon: <ShieldAlert className="h-4 w-4" />,
        danger: true,
        onClick: handleBan,
      }
    );
  }

  return (
    <ContextMenu open={open} x={x} y={y} items={items} onClose={onClose} />
  );
}
